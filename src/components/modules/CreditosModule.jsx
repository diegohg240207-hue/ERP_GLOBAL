import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getCredits, createCredit, getCustomers } from '../../services/db'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../common/StatusBadge'

const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
const STATUSES = ['', 'activo', 'vencido', 'revision', 'cancelado']

export default function CreditosModule({ lang }) {
  const { profile } = useAuth()
  const [credits, setCredits] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ customer_id: '', credit_limit: '', due_date: '', status: 'activo', payments_count: 1 })
  const [saving, setSaving] = useState(false)

  async function load() {
    const [creds, custs] = await Promise.all([getCredits(statusFilter), getCustomers()])
    setCredits(creds)
    setCustomers(custs)
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  const totalLimit = credits.reduce((s, c) => s + Number(c.credit_limit || 0), 0)
  const totalUsed = credits.reduce((s, c) => s + Number(c.balance_used || 0), 0)
  const overdue = credits.filter(c => c.status === 'vencido').length

  async function handleSave() {
    if (!form.customer_id || !form.credit_limit) { toast.error('Cliente y límite son requeridos'); return }
    setSaving(true)
    try {
      await createCredit({
        code: 'CRD-' + Date.now().toString(36).toUpperCase(),
        customer_id: form.customer_id,
        credit_limit: Number(form.credit_limit),
        balance_used: 0,
        status: form.status,
        due_date: form.due_date || null,
        payments_count: Number(form.payments_count) || 1
      })
      toast.success('Crédito creado')
      setShowForm(false)
      setForm({ customer_id: '', credit_limit: '', due_date: '', status: 'activo', payments_count: 1 })
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
          <div className="page-title">Créditos</div>
          <div className="page-sub">Control de líneas de crédito</div>
        </div>
        <div className="page-header-actions">
          {profile?.role === 'admin' && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nuevo crédito</button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total créditos</div>
          <div className="kpi-value">{credits.length}</div>
          <span className="kpi-icon">◇</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Límite total</div>
          <div className="kpi-value">{fmt(totalLimit)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Usado</div>
          <div className="kpi-value">{fmt(totalUsed)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Vencidos</div>
          <div className="kpi-value" style={{ color: overdue > 0 ? 'var(--danger)' : undefined }}>{overdue}</div>
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
                  <th>Cliente</th>
                  <th>Límite</th>
                  <th>Usado</th>
                  <th>Uso %</th>
                  <th>Disponible</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {credits.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>Sin créditos</td></tr>
                ) : credits.map(c => {
                  const pct = c.credit_limit > 0 ? (c.balance_used / c.credit_limit) * 100 : 0
                  const available = Number(c.credit_limit) - Number(c.balance_used)
                  return (
                    <tr key={c.id}>
                      <td><span className="text-accent" style={{ fontWeight: 600 }}>{c.code}</span></td>
                      <td style={{ fontWeight: 500 }}>{c.customers?.name || '—'}</td>
                      <td>{fmt(c.credit_limit)}</td>
                      <td style={{ color: pct > 80 ? 'var(--danger)' : 'var(--text)' }}>{fmt(c.balance_used)}</td>
                      <td style={{ minWidth: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar" style={{ flex: 1 }}>
                            <div className={`progress-bar-fill${pct > 90 ? ' danger' : pct > 70 ? ' warning' : ''}`} style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: available < 0 ? 'var(--danger)' : 'var(--accent)' }}>{fmt(available)}</td>
                      <td style={{ color: 'var(--text3)' }}>{c.due_date || '—'}</td>
                      <td><StatusBadge status={c.status} lang={lang} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nuevo crédito</span>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Cliente *</label>
                  <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                    <option value="">Seleccionar cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Límite de crédito *</label>
                  <input type="number" value={form.credit_limit} onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} placeholder="5000.00" />
                </div>
                <div className="field">
                  <label>Plazos (mensualidades)</label>
                  <input type="number" min={1} value={form.payments_count} onChange={e => setForm(f => ({ ...f, payments_count: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Vencimiento</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Estado</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="activo">Activo</option>
                    <option value="revision">En revisión</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Guardando...' : 'Crear crédito'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
