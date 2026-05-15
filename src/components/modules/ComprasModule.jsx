import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getPurchaseOrders, getSuppliers, createPurchaseOrder, getProducts } from '../../services/db'
import StatusBadge from '../common/StatusBadge'

const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
const STATUSES = ['', 'pendiente', 'confirmada', 'recibida', 'cancelada']

function genCode() { return 'OC-' + Date.now().toString(36).toUpperCase() }

export default function ComprasModule({ lang }) {
  const [orders, setOrders] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ supplier_id: '', status: 'pendiente' })
  const [formItems, setFormItems] = useState([{ product_id: '', product_name: '', qty: 1, unit_price: 0 }])
  const [saving, setSaving] = useState(false)

  async function load() {
    const [ords, sups, prods] = await Promise.all([getPurchaseOrders(statusFilter), getSuppliers(), getProducts()])
    setOrders(ords)
    setSuppliers(sups)
    setProducts(prods)
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  function addItem() { setFormItems(prev => [...prev, { product_id: '', product_name: '', qty: 1, unit_price: 0 }]) }

  function updateItem(i, field, value) {
    setFormItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item
      if (field === 'product_id') {
        const p = products.find(p => p.id === value)
        return { ...item, product_id: value, product_name: p?.name || '', unit_price: Number(p?.cost || 0) }
      }
      return { ...item, [field]: value }
    }))
  }

  async function handleSave() {
    if (!form.supplier_id) { toast.error('Selecciona un proveedor'); return }
    setSaving(true)
    try {
      const total = formItems.reduce((s, i) => s + Number(i.qty) * Number(i.unit_price), 0)
      const order = {
        code: genCode(),
        supplier_id: form.supplier_id,
        order_date: new Date().toISOString().split('T')[0],
        total,
        status: form.status
      }
      const items = formItems.filter(i => i.product_name).map(i => ({
        product_id: i.product_id || null,
        product_name: i.product_name,
        qty: Number(i.qty),
        unit_price: Number(i.unit_price),
        total: Number(i.qty) * Number(i.unit_price)
      }))
      await createPurchaseOrder(order, items)
      toast.success('Orden de compra creada')
      setShowForm(false)
      setForm({ supplier_id: '', status: 'pendiente' })
      setFormItems([{ product_id: '', product_name: '', qty: 1, unit_price: 0 }])
      load()
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const pending = orders.filter(o => o.status === 'pendiente').length
  const totalOrders = orders.reduce((s, o) => s + Number(o.total || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Compras</div>
          <div className="page-sub">Órdenes de compra a proveedores</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nueva OC</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total órdenes</div>
          <div className="kpi-value">{orders.length}</div>
          <span className="kpi-icon">◉</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pendientes</div>
          <div className="kpi-value" style={{ color: pending > 0 ? 'var(--warning)' : undefined }}>{pending}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total compras</div>
          <div className="kpi-value">{fmt(totalOrders)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Proveedores</div>
          <div className="kpi-value">{suppliers.length}</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="filter-chips">
          {STATUSES.map(s => (
            <span key={s} className={`chip${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s || 'Todos'}
            </span>
          ))}
        </div>
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Proveedor</th>
                  <th>Contacto</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>Sin órdenes</td></tr>
                ) : orders.map(o => (
                  <tr key={o.id}>
                    <td><span className="text-accent" style={{ fontWeight: 600 }}>{o.code}</span></td>
                    <td style={{ fontWeight: 500 }}>{o.suppliers?.name || '—'}</td>
                    <td style={{ color: 'var(--text3)' }}>{o.suppliers?.contact || '—'}</td>
                    <td>{o.order_date}</td>
                    <td style={{ fontWeight: 600 }}>{fmt(o.total)}</td>
                    <td><StatusBadge status={o.status} lang={lang} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nueva orden de compra</span>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field">
                  <label>Proveedor *</label>
                  <select value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Estado</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="pendiente">Pendiente</option>
                    <option value="confirmada">Confirmada</option>
                  </select>
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Productos</div>
              {formItems.map((item, i) => (
                <div key={i} className="form-grid-3" style={{ alignItems: 'end' }}>
                  <div className="field">
                    <label>Producto</label>
                    <select value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Cantidad</label>
                    <input type="number" min={1} value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Precio unit.</label>
                    <input type="number" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                  </div>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={addItem}>+ Agregar línea</button>

              <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                Total: {fmt(formItems.reduce((s, i) => s + Number(i.qty) * Number(i.unit_price), 0))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Guardando...' : 'Crear OC'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
