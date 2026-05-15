import { useState, useEffect } from 'react'
import { getSalesByDay, getTopProducts, getLayaways, getInventoryByCategory } from '../../services/db'
import { LineChart, BarChart, DonutChart } from '../common/Charts'

const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })

export default function ReportesModule({ lang }) {
  const [tab, setTab] = useState('ventas')
  const [period, setPeriod] = useState(7)
  const [salesData, setSalesData] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [layaways, setLayaways] = useState([])
  const [invByCategory, setInvByCategory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [sd, tp, lays, ibc] = await Promise.all([
        getSalesByDay(period),
        getTopProducts(10),
        getLayaways(''),
        getInventoryByCategory()
      ])
      setSalesData(sd)
      setTopProducts(tp)
      setLayaways(lays)
      setInvByCategory(ibc)
      setLoading(false)
    }
    load()
  }, [period])

  const salesTotal = salesData.reduce((s, d) => s + d.value, 0)
  const salesMax = Math.max(...salesData.map(d => d.value), 1)

  const layKpis = {
    total: layaways.length,
    active: layaways.filter(l => l.status === 'activo').length,
    completed: layaways.filter(l => l.status === 'completado').length,
    overdue: layaways.filter(l => l.status === 'vencido').length,
    totalCollected: layaways.reduce((s, l) => s + Number(l.down_payment || 0), 0),
    totalPending: layaways.reduce((s, l) => s + Number(l.balance || 0), 0)
  }

  const catSegments = invByCategory.slice(0, 5).map((c, i) => ({
    label: c.name,
    value: Math.round(c.value),
    color: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#f43f5e'][i % 5]
  }))
  const catTotal = catSegments.reduce((s, c) => s + c.value, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Reportes</div>
          <div className="page-sub">Análisis y estadísticas del negocio</div>
        </div>
      </div>

      <div className="view-tabs" style={{ marginBottom: 24, display: 'inline-flex' }}>
        {[
          { id: 'ventas', label: 'Ventas' },
          { id: 'productos', label: 'Productos' },
          { id: 'apartados', label: 'Apartados' },
          { id: 'inventario', label: 'Inventario' },
        ].map(t => (
          <button key={t.id} className={`view-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        <>
          {tab === 'ventas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Período:</span>
                <div className="filter-chips">
                  {[7, 14, 30].map(d => (
                    <span key={d} className={`chip${period === d ? ' active' : ''}`} onClick={() => setPeriod(d)}>
                      {d} días
                    </span>
                  ))}
                </div>
              </div>

              <div className="kpi-grid" style={{ marginBottom: 0 }}>
                <div className="kpi-card">
                  <div className="kpi-label">Total período</div>
                  <div className="kpi-value">{fmt(salesTotal)}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Promedio diario</div>
                  <div className="kpi-value">{fmt(salesTotal / period)}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Mejor día</div>
                  <div className="kpi-value">{fmt(salesMax)}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Días con venta</div>
                  <div className="kpi-value">{salesData.filter(d => d.value > 0).length}</div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-title">Ventas diarias — últimos {period} días</div>
                </div>
                <div className="card-body">
                  <LineChart data={salesData} height={160} />
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-title">Gráfica de barras</div>
                </div>
                <div className="card-body">
                  <BarChart data={salesData} />
                </div>
              </div>
            </div>
          )}

          {tab === 'productos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Top productos por ingresos</div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Producto</th>
                        <th>Unidades vendidas</th>
                        <th>Ingresos</th>
                        <th>Participación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>Sin datos</td></tr>
                      ) : topProducts.map((p, i) => {
                        const totalRev = topProducts.reduce((s, x) => s + x.total, 0)
                        const pct = totalRev > 0 ? (p.total / totalRev) * 100 : 0
                        return (
                          <tr key={i}>
                            <td style={{ color: 'var(--text3)', fontWeight: 600 }}>{i + 1}</td>
                            <td style={{ fontWeight: 500 }}>{p.name}</td>
                            <td>{p.qty}</td>
                            <td style={{ fontWeight: 600 }}>{fmt(p.total)}</td>
                            <td style={{ minWidth: 130 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div className="progress-bar" style={{ flex: 1 }}>
                                  <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                                </div>
                                <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{pct.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'apartados' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="kpi-grid-5">
                <div className="kpi-card">
                  <div className="kpi-label">Total</div>
                  <div className="kpi-value">{layKpis.total}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Activos</div>
                  <div className="kpi-value" style={{ color: 'var(--accent)' }}>{layKpis.active}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Completados</div>
                  <div className="kpi-value">{layKpis.completed}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Vencidos</div>
                  <div className="kpi-value" style={{ color: layKpis.overdue > 0 ? 'var(--danger)' : undefined }}>{layKpis.overdue}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Saldo pendiente</div>
                  <div className="kpi-value">{fmt(layKpis.totalPending)}</div>
                </div>
              </div>
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-label">Total cobrado (anticipos)</div>
                  <div className="kpi-value">{fmt(layKpis.totalCollected)}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Tasa completación</div>
                  <div className="kpi-value">{layKpis.total > 0 ? ((layKpis.completed / layKpis.total) * 100).toFixed(1) : 0}%</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Tasa vencimiento</div>
                  <div className="kpi-value" style={{ color: layKpis.overdue > 0 ? 'var(--danger)' : undefined }}>
                    {layKpis.total > 0 ? ((layKpis.overdue / layKpis.total) * 100).toFixed(1) : 0}%
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Saldo total generado</div>
                  <div className="kpi-value">{fmt(layaways.reduce((s, l) => s + Number(l.total || 0), 0))}</div>
                </div>
              </div>
            </div>
          )}

          {tab === 'inventario' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="grid-2">
                <div className="card">
                  <div className="card-header"><div className="card-title">Valor por categoría</div></div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Categoría</th>
                          <th>Valor en inventario</th>
                          <th>Participación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invByCategory.length === 0 ? (
                          <tr><td colSpan={3} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)' }}>Sin datos</td></tr>
                        ) : invByCategory.map((c, i) => {
                          const pct = catTotal > 0 ? (c.value / catTotal) * 100 : 0
                          return (
                            <tr key={i}>
                              <td style={{ fontWeight: 500 }}>{c.name}</td>
                              <td style={{ fontWeight: 600 }}>{fmt(c.value)}</td>
                              <td style={{ minWidth: 120 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div className="progress-bar" style={{ flex: 1 }}>
                                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: catSegments[i]?.color || 'var(--accent)' }} />
                                  </div>
                                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{pct.toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header"><div className="card-title">Distribución</div></div>
                  <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    {catSegments.length > 0 ? (
                      <>
                        <DonutChart segments={catSegments} size={120} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {catSegments.map((s, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                              <span style={{ color: 'var(--text2)' }}>{s.label}</span>
                              <span style={{ marginLeft: 'auto', fontWeight: 700, paddingLeft: 16 }}>{fmt(s.value)}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-muted">Sin datos de inventario</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
