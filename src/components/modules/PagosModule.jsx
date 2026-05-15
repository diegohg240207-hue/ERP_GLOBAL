import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getPayments, createPayment, getCustomers } from '../../services/db'
import { DonutChart } from '../common/Charts'
import StatusBadge from '../common/StatusBadge'

const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
const METHODS = ['', 'efectivo', 'tarjeta', 'transferencia', 'cheque']
const STATUSES = ['', 'aplicado', 'pendiente', 'en_proceso']

function genCode() { return 'PAG-' + Date.now().toString(36).toUpperCase() }

export default function PagosModule({ lang }) {
  const [payments, setPayments] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [methodFilter, setMethodFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    customer_id: '', amount: '', method: 'efectivo', account: '',
    reference_type: 'venta', reference_id: '', status: 'aplicado'
  })
  const [saving, setSaving] = useState(false)

  async function load() {
    const [pays, custs] = await Promise.all([getPayments(methodFilter, statusFilter), getCustomers()])
    setPayments(pays)
    setCustomers(custs)
    setLoading(false)
  }

  useEffect(() => { load() }, [methodFilter, statusFilter])

  // Breakdown by method
  const byMethod = (method) => payments.filter(p => p.method === method).reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalPagos = payments.reduce((s, p) => s + Number(p.amount || 0), 0)

  const donutSegments = [
    { label: 'Efectivo',      value: byMethod('efectivo'),      color: '#10b981' },
    { label: 'Tarjeta',       value: byMethod('tarjeta'),       color: '#3b82f6' },
    { label: 'Transferencia', value: byMethod('transferencia'), color: '#f59e0b' },
    { label: 'Cheque',        value: byMethod('cheque'),        color: '#8b5cf6' },
  ].filter(s => s.value > 0)

  async function handleSave() {
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Ingresa un monto válido'); return }
    setSaving(true)
    try {
      await createPayment({
        code: genCode(),
        reference_type: form.reference_type,
        reference_id: form.reference_id || null,
        customer_id: form.customer_id || null,
        amount: Number(form.amount),
        method: form.method,
        account: form.account || null,
        status: form.status,
        payment_date: new Date().toISOString().split('T')[0]
      })
      toast.success('Pago registrado')
      setShowForm(false)
      setForm({ customer_id: '', amount: '', method: 'efectivo', account: '', reference_type: 'venta', reference_id: '', status: 'aplicado' })
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
          <div className="page-title">Pagos</div>
          <div className="page-sub">Registro y seguimiento de pagos</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Registrar pago</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total cobrado</div>
          <div className="kpi-value">{fmt(totalPagos)}</div>
          <span className="kpi-icon">◑</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Efectivo</div>
          <div className="kpi-value">{fmt(byMethod('efectivo'))}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Tarjeta</div>
          <div className="kpi-value">{fmt(byMethod('tarjeta'))}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Transferencia</div>
          <div className="kpi-value">{fmt(byMethod('transferencia'))}</div>
        </div>
      </div>

      {/* Method Breakdown Chart */}
      {donutSegments.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><div className="card-title">Desglose por método</div></div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <DonutChart segments={donutSegments} size={100} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {donutSegments.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                  <span style={{ color: 'var(--text2)', minWidth: 100 }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{fmt(s.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="filter-chips">
          {METHODS.map(m => (
            <span key={m} className={`chip${methodFilter === m ? ' active' : ''}`} onClick={() => setMethodFilter(m)}>
              {m || 'Todos'}
            </span>
          ))}
        </div>
        <div className="filter-chips">
          {STATUSES.map(s => (
            <span key={s} className={`chip${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s || 'Cualquier estado'}
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
                  <th>Referencia</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Cuenta</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>Sin pagos</td></tr>
                ) : payments.map(p => (
                  <tr key={p.id}>
                    <td><span className="text-accent" style={{ fontWeight: 600 }}>{p.code}</span></td>
                    <td>{p.customers?.name || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'capitalize' }}>{p.reference_type}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(p.amount)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.method}</td>
                    <td style={{ color: 'var(--text3)' }}>{p.account || '—'}</td>
                    <td>{p.payment_date}</td>
                    <td><StatusBadge status={p.status} lang={lang} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Registrar pago</span>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field">
                  <label>Cliente</label>
                  <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                    <option value="">Sin cliente</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Tipo de referencia</label>
                  <select value={form.reference_type} onChange={e => setForm(f => ({ ...f, reference_type: e.target.value }))}>
                    <option value="venta">Venta</option>
                    <option value="credito">Crédito</option>
                    <option value="apartado">Apartado</option>
                  </select>
                </div>
                <div className="field">
                  <label>Monto *</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="field">
                  <label>Método</label>
                  <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div className="field">
                  <label>Cuenta / Referencia banco</label>
                  <input value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))} placeholder="Número de cuenta o ref." />
                </div>
                <div className="field">
                  <label>Estado</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="aplicado">Aplicado</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En proceso</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
