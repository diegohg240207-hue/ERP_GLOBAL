import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getPromotions, createPromotion } from '../../services/db'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../common/StatusBadge'

const STATUSES = ['', 'activo', 'vencido', 'programado']
const TYPES = ['porcentaje', 'monto_fijo', 'bundle', 'cupon', 'monto_minimo']

const TYPE_LABELS = {
  porcentaje: '% Descuento',
  monto_fijo: 'Monto fijo',
  bundle: 'Bundle',
  cupon: 'Cupón',
  monto_minimo: 'Monto mínimo'
}

const TYPE_COLORS = {
  porcentaje: 'badge-green',
  monto_fijo: 'badge-blue',
  bundle: 'badge-purple',
  cupon: 'badge-orange',
  monto_minimo: 'badge-yellow'
}

function genCode() { return 'PROMO-' + Date.now().toString(36).toUpperCase() }

export default function PromocionesModule({ lang }) {
  const { profile } = useAuth()
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'porcentaje', discount_value: '', applies_to: '',
    start_date: '', end_date: '', status: 'activo'
  })
  const [saving, setSaving] = useState(false)

  async function load() {
    const data = await getPromotions(statusFilter)
    setPromotions(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  async function handleSave() {
    if (!form.name || !form.discount_value) { toast.error('Nombre y descuento son requeridos'); return }
    setSaving(true)
    try {
      await createPromotion({
        code: genCode(),
        name: form.name,
        type: form.type,
        discount_value: Number(form.discount_value),
        applies_to: form.applies_to || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
        uses_count: 0
      })
      toast.success('Promoción creada')
      setShowForm(false)
      setForm({ name: '', type: 'porcentaje', discount_value: '', applies_to: '', start_date: '', end_date: '', status: 'activo' })
      load()
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const active = promotions.filter(p => p.status === 'activo').length
  const totalUses = promotions.reduce((s, p) => s + (p.uses_count || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Promociones</div>
          <div className="page-sub">Gestión de descuentos y ofertas</div>
        </div>
        <div className="page-header-actions">
          {profile?.role === 'admin' && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nueva promoción</button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total</div>
          <div className="kpi-value">{promotions.length}</div>
          <span className="kpi-icon">◬</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Activas</div>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>{active}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total usos</div>
          <div className="kpi-value">{totalUses}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Vencidas</div>
          <div className="kpi-value">{promotions.filter(p => p.status === 'vencido').length}</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="filter-chips">
          {STATUSES.map(s => (
            <span key={s} className={`chip${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s || 'Todas'}
            </span>
          ))}
        </div>
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {promotions.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-icon">◬</div>
              <div className="empty-title">Sin promociones</div>
              <div className="empty-sub">Crea la primera promoción</div>
            </div>
          ) : promotions.map(p => (
            <div key={p.id} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span className={`badge ${TYPE_COLORS[p.type] || 'badge-gray'}`}>{TYPE_LABELS[p.type] || p.type}</span>
                  <StatusBadge status={p.status} lang={lang} />
                </div>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: 10 }}>
                  {p.type === 'porcentaje' ? `${p.discount_value}%` : `$${p.discount_value}`}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)' }}>
                  {p.code && <span>Código: <strong style={{ color: 'var(--text2)' }}>{p.code}</strong></span>}
                  {p.applies_to && <span>Aplica a: {p.applies_to}</span>}
                  {p.start_date && <span>Inicio: {p.start_date}</span>}
                  {p.end_date && <span>Fin: {p.end_date}</span>}
                  <span>Usos: {p.uses_count || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nueva promoción</span>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Nombre *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre de la promoción" />
                </div>
                <div className="field">
                  <label>Tipo</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Valor del descuento *</label>
                  <input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} placeholder={form.type === 'porcentaje' ? '10' : '50.00'} />
                </div>
                <div className="field">
                  <label>Aplica a</label>
                  <input value={form.applies_to} onChange={e => setForm(f => ({ ...f, applies_to: e.target.value }))} placeholder="Categoría, producto o todos" />
                </div>
                <div className="field">
                  <label>Estado</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="activo">Activo</option>
                    <option value="programado">Programado</option>
                  </select>
                </div>
                <div className="field">
                  <label>Fecha inicio</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Fecha fin</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Guardando...' : 'Crear promoción'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
