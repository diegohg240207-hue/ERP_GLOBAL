import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getProducts, getProductVariants, createProduct, createProductVariant } from '../../services/db'
import StatusBadge from '../common/StatusBadge'

const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })

export default function ProductosModule({ lang }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [variants, setVariants] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', category: '', brand: '', price: '', cost: '', status: 'activo' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const data = await getProducts()
    setProducts(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function selectProduct(p) {
    setSelected(p)
    const vars = await getProductVariants(p.id)
    setVariants(vars)
  }

  const cats = [...new Set(products.map(p => p.category).filter(Boolean))]
  const filtered = products.filter(p => {
    const s = search.toLowerCase()
    const matchS = !search || p.name?.toLowerCase().includes(s) || p.code?.toLowerCase().includes(s)
    const matchC = !catFilter || p.category === catFilter
    return matchS && matchC
  })

  async function handleSave() {
    if (!form.name) { toast.error('Nombre requerido'); return }
    setSaving(true)
    try {
      await createProduct({
        name: form.name,
        code: form.code || null,
        category: form.category || null,
        brand: form.brand || null,
        price: Number(form.price) || 0,
        cost: Number(form.cost) || 0,
        status: form.status
      })
      toast.success('Producto creado')
      setShowForm(false)
      setForm({ name: '', code: '', category: '', brand: '', price: '', cost: '', status: 'activo' })
      load()
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Productos</div>
          <div className="page-sub">{products.length} productos en catálogo</div>
        </div>
        <div className="page-header-actions">
          <div className="view-tabs">
            <button className={`view-tab${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>≡ Lista</button>
            <button className={`view-tab${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')}>⬚ Cuadrícula</button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nuevo producto</button>
        </div>
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Buscar nombre, código..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="filter-chips">
          <span className={`chip${!catFilter ? ' active' : ''}`} onClick={() => setCatFilter('')}>Todos</span>
          {cats.map(c => <span key={c} className={`chip${catFilter === c ? ' active' : ''}`} onClick={() => setCatFilter(c)}>{c}</span>)}
        </div>
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        <div className={selected ? 'grid-2' : ''} style={{ alignItems: 'start' }}>
          <div>
            {view === 'list' ? (
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Categoría</th>
                        <th>Marca</th>
                        <th>Precio</th>
                        <th>Costo</th>
                        <th>Variantes</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>Sin productos</td></tr>
                      ) : filtered.map(p => (
                        <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => selectProduct(p)}>
                          <td><span className="text-accent" style={{ fontWeight: 600 }}>{p.code || '—'}</span></td>
                          <td style={{ fontWeight: 500 }}>{p.name}</td>
                          <td>{p.category || '—'}</td>
                          <td>{p.brand || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{fmt(p.price)}</td>
                          <td>{fmt(p.cost)}</td>
                          <td><span className="badge badge-blue">{p.variant_count}</span></td>
                          <td><StatusBadge status={p.status} lang={lang} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                {filtered.map(p => (
                  <div key={p.id} className="card" style={{ cursor: 'pointer', padding: 16 }} onClick={() => selectProduct(p)}>
                    <div style={{ width: '100%', height: 80, background: 'var(--bg3)', borderRadius: 8, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                      {p.image_url ? <img src={p.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} alt="" /> : '▣'}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>{p.category} · {p.brand}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>{fmt(p.price)}</div>
                    <div style={{ marginTop: 8 }}><StatusBadge status={p.status} lang={lang} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="card" style={{ position: 'sticky', top: 0 }}>
              <div className="card-header">
                <div className="card-title">{selected.name}</div>
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setSelected(null)}>✕</button>
              </div>
              <div className="card-body">
                <div className="detail-grid" style={{ marginBottom: 16 }}>
                  <div className="detail-item">
                    <div className="detail-label">Código</div>
                    <div className="detail-value">{selected.code || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Categoría</div>
                    <div className="detail-value">{selected.category || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Precio venta</div>
                    <div className="detail-value text-accent" style={{ fontWeight: 700 }}>{fmt(selected.price)}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Costo</div>
                    <div className="detail-value">{fmt(selected.cost)}</div>
                  </div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>
                  Variantes ({variants.length})
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Color</th>
                        <th>Talla</th>
                        <th>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text3)', padding: '16px 0' }}>Sin variantes</td></tr>
                      ) : variants.map(v => (
                        <tr key={v.id}>
                          <td style={{ fontSize: 11 }}>{v.sku || '—'}</td>
                          <td>{v.color || '—'}</td>
                          <td>{v.size || '—'}</td>
                          <td>
                            <span style={{ fontWeight: 600, color: v.stock === 0 ? 'var(--danger)' : v.stock < 5 ? 'var(--warning)' : 'var(--text)' }}>
                              {v.stock}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Product Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nuevo producto</span>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Nombre *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del producto" />
                </div>
                <div className="field">
                  <label>Código</label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="PROD-001" />
                </div>
                <div className="field">
                  <label>Categoría</label>
                  <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Categoría" />
                </div>
                <div className="field">
                  <label>Marca</label>
                  <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Marca" />
                </div>
                <div className="field">
                  <label>Estado</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="activo">Activo</option>
                    <option value="agotado">Agotado</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
                <div className="field">
                  <label>Precio venta</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="field">
                  <label>Costo</label>
                  <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Guardando...' : 'Crear producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
