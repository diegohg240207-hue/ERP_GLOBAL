import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getDashboardKpis, getWeeklySales, getLayawayStatusCounts, getRecentSales } from '../../services/db'
import { LineChart, DonutChart } from '../common/Charts'
import StatusBadge from '../common/StatusBadge'

const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function DashboardModule({ lang, onNavigate }) {
  const [kpis, setKpis] = useState(null)
  const [weekly, setWeekly] = useState([])
  const [layawayStatus, setLayawayStatus] = useState({})
  const [recentSales, setRecentSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [k, w, ls, rs] = await Promise.all([
          getDashboardKpis(),
          getWeeklySales(),
          getLayawayStatusCounts(),
          getRecentSales(5)
        ])
        setKpis(k)
        setWeekly(w)
        setLayawayStatus(ls)
        setRecentSales(rs)
      } catch (e) {
        toast.error('Error cargando dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  const donutSegments = [
    { label: 'Activo',     value: layawayStatus.activo || 0,    color: '#10b981' },
    { label: 'Próximo',    value: layawayStatus.proximo || 0,   color: '#f59e0b' },
    { label: 'Vencido',    value: layawayStatus.vencido || 0,   color: '#ef4444' },
    { label: 'Completado', value: layawayStatus.completado || 0, color: '#3b82f6' },
  ].filter(s => s.value > 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Resumen general del negocio</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => onNavigate('pos')}>+ Nueva venta</button>
        </div>
      </div>

      {/* Alerts */}
      {(kpis?.overdueLayaways || 0) > 0 && (
        <div className="alert alert-warning" onClick={() => onNavigate('apartados')} style={{ cursor: 'pointer' }}>
          ⚠ {kpis.overdueLayaways} apartado(s) vencido(s) — haz clic para ver
        </div>
      )}
      {((kpis?.lowStock || 0) + (kpis?.criticalStock || 0)) > 0 && (
        <div className="alert alert-danger" onClick={() => onNavigate('inventario')} style={{ cursor: 'pointer' }}>
          ⚡ {kpis.criticalStock} producto(s) sin stock y {kpis.lowStock} con stock bajo — ver inventario
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-grid-5">
        <div className="kpi-card">
          <div className="kpi-label">Ventas hoy</div>
          <div className="kpi-value">{fmt(kpis?.salesTodayTotal)}</div>
          <div className="kpi-sub">Total del día</div>
          <span className="kpi-icon">💰</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ventas del mes</div>
          <div className="kpi-value">{fmt(kpis?.salesMonthTotal)}</div>
          <div className="kpi-sub">Mes en curso</div>
          <span className="kpi-icon">📈</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Apartados activos</div>
          <div className="kpi-value">{kpis?.activeLayaways || 0}</div>
          <div className="kpi-sub">Activo + próximos</div>
          <span className="kpi-icon">◧</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Vencidos</div>
          <div className="kpi-value" style={{ color: kpis?.overdueLayaways > 0 ? 'var(--danger)' : undefined }}>
            {kpis?.overdueLayaways || 0}
          </div>
          <div className="kpi-sub">Apartados vencidos</div>
          <span className="kpi-icon">⚠</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Stock crítico</div>
          <div className="kpi-value" style={{ color: kpis?.criticalStock > 0 ? 'var(--danger)' : undefined }}>
            {(kpis?.criticalStock || 0) + (kpis?.lowStock || 0)}
          </div>
          <div className="kpi-sub">Bajo + sin stock</div>
          <span className="kpi-icon">▦</span>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Ventas últimos 7 días</div>
          </div>
          <div className="card-body">
            {weekly.length > 0 ? (
              <LineChart data={weekly} height={120} />
            ) : (
              <div className="text-muted" style={{ fontSize: 13, textAlign: 'center', padding: 24 }}>Sin datos</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Estado de apartados</div>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {donutSegments.length > 0 ? (
              <>
                <DonutChart segments={donutSegments} size={110} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {donutSegments.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ color: 'var(--text2)' }}>{s.label}</span>
                      <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--text)', paddingLeft: 16 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-muted" style={{ fontSize: 13, width: '100%', textAlign: 'center' }}>Sin apartados</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Ventas recientes</div>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => onNavigate('ventas')}>
            Ver todas →
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: '24px 0' }}>Sin ventas recientes</td></tr>
              ) : recentSales.map(s => (
                <tr key={s.id}>
                  <td><span className="text-accent" style={{ fontWeight: 600 }}>{s.code || s.id?.slice(0, 8)}</span></td>
                  <td>{s.customers?.name || '—'}</td>
                  <td>{s.sale_date}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(s.total)}</td>
                  <td><StatusBadge status={s.status} lang={lang} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
