import { useState, useEffect } from 'react'
import { getInventoryItems } from '../../services/db'
import { SparkChart } from '../common/Charts'
import StatusBadge from '../common/StatusBadge'

const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })

export default function InventarioModule({ lang }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getInventoryItems().then(data => {
      setItems(data)
      setLoading(false)
    })
  }, [])

  const filtered = items.filter(i => {
    const s = search.toLowerCase()
    const matchS = !search || (i.name || '').toLowerCase().includes(s) || (i.sku || '').toLowerCase().includes(s)
    const matchSt = !statusFilter || i.computed_status === statusFilter
    return matchS && matchSt
  })

  const okCount = items.filter(i => i.computed_status === 'ok').length
  const lowCount = items.filter(i => i.computed_status === 'bajo').length
  const critCount = items.filter(i => i.computed_status === 'critico').length
  const totalValue = items.reduce((s, i) => s + Number(i.stock || 0) * Number(i.price || 0), 0)

  // Simulate stock trend sparkline (random-ish demo)
  function sparkValues(item) {
    const base = item.stock
    return [base + 5, base + 3, base + 8, base + 2, base + 4, base + 1, base]
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Inventario</div>
          <div className="page-sub">Control de stock de productos</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total ítems</div>
          <div className="kpi-value">{items.length}</div>
          <span className="kpi-icon">▦</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Valor en inventario</div>
          <div className="kpi-value">{fmt(totalValue)}</div>
          <span className="kpi-icon">💰</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Stock bajo</div>
          <div className="kpi-value" style={{ color: lowCount > 0 ? 'var(--warning)' : undefined }}>{lowCount}</div>
          <span className="kpi-icon">⚠</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Sin stock</div>
          <div className="kpi-value" style={{ color: critCount > 0 ? 'var(--danger)' : undefined }}>{critCount}</div>
          <span className="kpi-icon">⚡</span>
        </div>
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Buscar SKU, nombre..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="filter-chips">
          <span className={`chip${!statusFilter ? ' active' : ''}`} onClick={() => setStatusFilter('')}>Todos</span>
          <span className={`chip${statusFilter === 'ok' ? ' active' : ''}`} onClick={() => setStatusFilter('ok')}>OK</span>
          <span className={`chip${statusFilter === 'bajo' ? ' active' : ''}`} onClick={() => setStatusFilter('bajo')}>Stock bajo</span>
          <span className={`chip${statusFilter === 'critico' ? ' active' : ''}`} onClick={() => setStatusFilter('critico')}>Crítico</span>
        </div>
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Stock</th>
                  <th>Mín.</th>
                  <th>Nivel</th>
                  <th>Precio</th>
                  <th>Valor</th>
                  <th>Tendencia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>Sin ítems</td></tr>
                ) : filtered.map(item => {
                  const pct = item.min_stock > 0 ? Math.min(100, (item.stock / item.min_stock) * 100) : 100
                  const barClass = item.computed_status === 'critico' ? 'danger' : item.computed_status === 'bajo' ? 'warning' : ''
                  return (
                    <tr key={item.id}>
                      <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{item.sku || '—'}</td>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td>{item.category || '—'}</td>
                      <td style={{ fontWeight: 700, color: item.stock === 0 ? 'var(--danger)' : item.stock < item.min_stock ? 'var(--warning)' : 'var(--text)' }}>
                        {item.stock}
                      </td>
                      <td style={{ color: 'var(--text3)' }}>{item.min_stock}</td>
                      <td style={{ minWidth: 100 }}>
                        <div className="progress-bar">
                          <div className={`progress-bar-fill ${barClass}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </td>
                      <td>{fmt(item.price)}</td>
                      <td style={{ fontWeight: 600 }}>{fmt(Number(item.stock) * Number(item.price))}</td>
                      <td><SparkChart values={sparkValues(item)} height={30} color={item.computed_status === 'ok' ? 'var(--accent)' : 'var(--warning)'} /></td>
                      <td><StatusBadge status={item.computed_status} lang={lang} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
