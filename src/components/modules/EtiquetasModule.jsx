import { useState, useEffect } from 'react'
import { getPOSCatalog, getInventoryItems } from '../../services/db'

const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })

function printLabels(items, options) {
  const win = window.open('', '_blank', 'width=400,height=600')
  const labels = items.flatMap(item =>
    Array.from({ length: item.qty }, (_, i) => `
      <div class="label">
        ${options.showBrand ? `<div class="brand">ERP Global</div>` : ''}
        <div class="name">${item.name}</div>
        ${(item.color || item.size) ? `<div class="variant">${[item.color, item.size].filter(Boolean).join(' / ')}</div>` : ''}
        ${options.showSku && item.sku ? `<div class="sku">${item.sku}</div>` : ''}
        ${options.showPrice ? `<div class="price">${fmt(item.price)}</div>` : ''}
      </div>
    `)
  ).join('')

  win.document.write(`
    <html><head><title>Etiquetas</title>
    <style>
      @page { size: 29mm auto; margin: 0; }
      body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
      .label {
        width: 29mm;
        min-height: 15mm;
        padding: 2mm;
        border: 0.5px solid #ccc;
        page-break-after: always;
        display: flex;
        flex-direction: column;
        justify-content: center;
        box-sizing: border-box;
      }
      .brand { font-size: 6px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
      .name { font-size: 8px; font-weight: bold; color: #000; line-height: 1.2; }
      .variant { font-size: 6px; color: #444; }
      .sku { font-size: 6px; color: #666; font-family: monospace; }
      .price { font-size: 11px; font-weight: bold; color: #000; margin-top: 1mm; }
    </style></head>
    <body>${labels}</body></html>
  `)
  win.document.close()
  win.focus()
  win.print()
}

export default function EtiquetasModule({ lang }) {
  const [source, setSource] = useState('catalog') // catalog | inventory
  const [catalog, setCatalog] = useState([])
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([]) // [{ id, name, color, size, sku, price, qty }]
  const [options, setOptions] = useState({ showPrice: true, showSku: true, showBrand: true })

  useEffect(() => {
    async function load() {
      const [cat, inv] = await Promise.all([getPOSCatalog(), getInventoryItems()])
      setCatalog(cat)
      setInventory(inv)
      setLoading(false)
    }
    load()
  }, [])

  const items = source === 'catalog'
    ? catalog.map(v => ({
        id: v.id,
        name: v.products?.name || '',
        color: v.color || '',
        size: v.size || '',
        sku: v.sku || '',
        price: Number(v.products?.price || 0),
        category: v.products?.category || ''
      }))
    : inventory.map(i => ({
        id: i.id,
        name: i.name || '',
        color: '',
        size: '',
        sku: i.sku || '',
        price: Number(i.price || 0),
        category: i.category || ''
      }))

  const filtered = items.filter(i => {
    if (!search) return true
    const s = search.toLowerCase()
    return (i.name || '').toLowerCase().includes(s) || (i.sku || '').toLowerCase().includes(s)
  })

  function toggleItem(item) {
    setSelected(prev => {
      const exists = prev.find(x => x.id === item.id)
      if (exists) return prev.filter(x => x.id !== item.id)
      return [...prev, { ...item, qty: 1 }]
    })
  }

  function updateQty(id, qty) {
    setSelected(prev => prev.map(x => x.id === id ? { ...x, qty: Math.max(1, Number(qty)) } : x))
  }

  function isSelected(id) { return selected.some(x => x.id === id) }

  const totalLabels = selected.reduce((s, i) => s + i.qty, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Etiquetas</div>
          <div className="page-sub">Impresión de etiquetas 29mm</div>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-primary"
            disabled={!selected.length}
            onClick={() => printLabels(selected, options)}
          >
            🖨 Imprimir {totalLabels} etiqueta{totalLabels !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
        {/* Left: catalog */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="toolbar">
            <div className="view-tabs">
              <button className={`view-tab${source === 'catalog' ? ' active' : ''}`} onClick={() => setSource('catalog')}>Catálogo</button>
              <button className={`view-tab${source === 'inventory' ? ' active' : ''}`} onClick={() => setSource('inventory')}>Inventario</button>
            </div>
            <input className="search-input" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {loading ? <div className="loading-center"><div className="spinner" /></div> : (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th></th>
                      <th>Nombre</th>
                      {source === 'catalog' && <><th>Color</th><th>Talla</th></>}
                      <th>SKU</th>
                      <th>Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>Sin ítems</td></tr>
                    ) : filtered.map(item => (
                      <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => toggleItem(item)}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected(item.id)}
                            onChange={() => toggleItem(item)}
                            onClick={e => e.stopPropagation()}
                          />
                        </td>
                        <td style={{ fontWeight: 500 }}>{item.name}</td>
                        {source === 'catalog' && <><td>{item.color || '—'}</td><td>{item.size || '—'}</td></>}
                        <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text3)' }}>{item.sku || '—'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{fmt(item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: options + preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Options */}
          <div className="card">
            <div className="card-header"><div className="card-title">Opciones</div></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'showPrice', label: 'Mostrar precio' },
                { key: 'showSku', label: 'Mostrar SKU' },
                { key: 'showBrand', label: 'Mostrar marca' },
              ].map(opt => (
                <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
                  <input
                    type="checkbox"
                    checked={options[opt.key]}
                    onChange={e => setOptions(o => ({ ...o, [opt.key]: e.target.checked }))}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="card">
            <div className="card-header"><div className="card-title">Vista previa</div></div>
            <div className="card-body">
              {selected.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <div className="empty-icon">▥</div>
                  <div className="empty-sub">Selecciona productos</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selected.map(item => (
                    <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {/* Label preview (125px wide simulation) */}
                      <div style={{
                        width: 125, border: '1px solid var(--border)', borderRadius: 4,
                        padding: '6px 8px', background: '#fff', color: '#000',
                        fontSize: 10, lineHeight: 1.4
                      }}>
                        {options.showBrand && <div style={{ fontSize: 7, color: '#666', letterSpacing: 1 }}>ERP GLOBAL</div>}
                        <div style={{ fontWeight: 700, fontSize: 9 }}>{item.name}</div>
                        {(item.color || item.size) && <div style={{ fontSize: 8, color: '#444' }}>{[item.color, item.size].filter(Boolean).join(' / ')}</div>}
                        {options.showSku && item.sku && <div style={{ fontSize: 7, color: '#666' }}>{item.sku}</div>}
                        {options.showPrice && <div style={{ fontWeight: 700, fontSize: 12, marginTop: 2 }}>{fmt(item.price)}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1 }}>{item.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button onClick={() => updateQty(item.id, item.qty - 1)} style={{ background: 'var(--bg3)', border: 'none', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', color: 'var(--text)', fontSize: 14 }}>−</button>
                          <input
                            type="number"
                            value={item.qty}
                            min={1}
                            onChange={e => updateQty(item.id, e.target.value)}
                            style={{ width: 40, textAlign: 'center', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px', fontSize: 12, color: 'var(--text)' }}
                          />
                          <button onClick={() => updateQty(item.id, item.qty + 1)} style={{ background: 'var(--bg3)', border: 'none', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', color: 'var(--text)', fontSize: 14 }}>+</button>
                          <button onClick={() => setSelected(p => p.filter(x => x.id !== item.id))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="divider" />
                  <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center' }}>
                    Total: <strong>{totalLabels}</strong> etiqueta{totalLabels !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
