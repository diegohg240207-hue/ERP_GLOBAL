import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getLayaways, createLayaway, addLayawayPayment, getCustomers, getPOSCatalog, getSettings } from '../../services/db'
import StatusBadge from '../common/StatusBadge'

const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
const STATUSES = ['', 'activo', 'proximo', 'vencido', 'completado', 'cancelado']

function genCode() { return 'APT-' + Date.now().toString(36).toUpperCase() }

export default function ApartadosModule({ lang }) {
  const [layaways, setLayaways] = useState([])
  const [customers, setCustomers] = useState([])
  const [catalog, setCatalog] = useState([])
  const [settings, setSettings] = useState({ layaway_min_pct: '20', layaway_days: '30' })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [form, setForm] = useState({ customer_id: '', down_payment: '' })
  const [formItems, setFormItems] = useState([{ variant_id: '', product_name: '', color: '', size: '', price: 0 }])
  const [payForm, setPayForm] = useState({ amount: '', method: 'efectivo' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const [lays, custs, cat, setts] = await Promise.all([
      getLayaways(statusFilter), getCustomers(), getPOSCatalog(), getSettings()
    ])
    setLayaways(lays)
    setCustomers(custs)
    setCatalog(cat)
    setSettings(setts)
    if (selected) {
      const refreshed = lays.find(l => l.id === selected.id)
      if (refreshed) setSelected(refreshed)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  const overdue = layaways.filter(l => l.status === 'vencido')
  const totalItems = layaways.length
  const activeCount = layaways.filter(l => ['activo', 'proximo'].includes(l.status)).length
  const totalBalance = layaways.filter(l => !['completado', 'cancelado'].includes(l.status)).reduce((s, l) => s + Number(l.balance || 0), 0)

  function updateFormItem(i, field, value) {
    setFormItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item
      if (field === 'variant_id') {
        const v = catalog.find(x => x.id === value)
        return { ...item, variant_id: value, product_name: v?.products?.name || '', color: v?.color || '', size: v?.size || '', price: Number(v?.products?.price || 0) }
      }
      return { ...item, [field]: value }
    }))
  }

  const formTotal = formItems.reduce((s, i) => s + Number(i.price || 0), 0)
  const minDown = formTotal * (Number(settings.layaway_min_pct || 20) / 100)

  async function handleSave() {
    if (!form.customer_id) { toast.error('Selecciona un cliente'); return }
    if (!formItems.some(i => i.product_name)) { toast.error('Agrega al menos un producto'); return }
    if (Number(form.down_payment) < minDown) { toast.error(`Anticipo mínimo: ${fmt(minDown)}`); return }
    setSaving(true)
    try {
      const today = new Date()
      const dueDate = new Date(today)
      dueDate.setDate(today.getDate() + Number(settings.layaway_days || 30))

      const layawayData = {
        code: genCode(),
        customer_id: form.customer_id,
        total: formTotal,
        down_payment: Number(form.down_payment),
        balance: formTotal - Number(form.down_payment),
        start_date: today.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status: 'activo'
      }
      const items = formItems.filter(i => i.product_name).map(i => ({
        product_variant_id: i.variant_id || null,
        product_name: i.product_name,
        color: i.color,
        size: i.size,
        price: Number(i.price)
      }))
      await createLayaway(layawayData, items)
      toast.success('Apartado creado')
      setShowForm(false)
      setForm({ customer_id: '', down_payment: '' })
      setFormItems([{ variant_id: '', product_name: '', color: '', size: '', price: 0 }])
      load()
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handlePayment() {
    if (!payForm.amount || Number(payForm.amount) <= 0) { toast.error('Ingresa un monto válido'); return }
    setSaving(true)
    try {
      await addLayawayPayment(selected.id, Number(payForm.amount), payForm.method)
      toast.success('Pago registrado')
      setShowPayment(false)
      setPayForm({ amount: '', method: 'efectivo' })
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
          <div className="page-title">Apartados</div>
          <div className="page-sub">Gestión de ventas en apartado</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nuevo apartado</button>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="alert alert-warning">
          ⚠ {overdue.length} apartado(s) vencido(s) — requieren atención
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total apartados</div>
          <div className="kpi-value">{totalItems}</div>
          <span className="kpi-icon">◧</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Activos</div>
          <div className="kpi-value">{activeCount}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Vencidos</div>
          <div className="kpi-value" style={{ color: overdue.length > 0 ? 'var(--danger)' : undefined }}>{overdue.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Saldo pendiente</div>
          <div className="kpi-value">{fmt(totalBalance)}</div>
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
        <div className={selected ? 'grid-2' : ''} style={{ alignItems: 'start', gap: 20 }}>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Anticipo</th>
                    <th>Saldo</th>
                    <th>Inicio</th>
                    <th>Vence</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {layaways.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>Sin apartados</td></tr>
                  ) : layaways.map(l => (
                    <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(l)}>
                      <td><span className="text-accent" style={{ fontWeight: 600 }}>{l.code}</span></td>
                      <td style={{ fontWeight: 500 }}>{l.customers?.name || '—'}</td>
                      <td>{fmt(l.total)}</td>
                      <td>{fmt(l.down_payment)}</td>
                      <td style={{ fontWeight: 600, color: Number(l.balance) > 0 ? 'var(--warning)' : 'var(--accent)' }}>{fmt(l.balance)}</td>
                      <td style={{ color: 'var(--text3)' }}>{l.start_date}</td>
                      <td style={{ color: l.status === 'vencido' ? 'var(--danger)' : 'var(--text3)' }}>{l.due_date}</td>
                      <td><StatusBadge status={l.status} lang={lang} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="card" style={{ position: 'sticky', top: 0 }}>
              <div className="card-header">
                <div className="card-title">{selected.code} — {selected.customers?.name}</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
                    <span>Progreso de pago</span>
                    <span>{fmt(Number(selected.total) - Number(selected.balance))} / {fmt(selected.total)}</span>
                  </div>
                  <div className="progress-bar" style={{ height: 10 }}>
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${selected.total > 0 ? Math.min(100, ((Number(selected.total) - Number(selected.balance)) / Number(selected.total)) * 100) : 0}%` }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                    <span>Saldo: {fmt(selected.balance)}</span>
                    <span>Vence: {selected.due_date}</span>
                  </div>
                </div>

                {/* Products */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Productos reservados</div>
                  {(selected.layaway_items || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span>{item.product_name} {item.color && `— ${item.color}`} {item.size && item.size}</span>
                      <span style={{ fontWeight: 600 }}>{fmt(item.price)}</span>
                    </div>
                  ))}
                </div>

                {/* Payment history */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Historial de pagos</div>
                  {(selected.layaway_payments || []).length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>Sin pagos registrados</div>
                  ) : (selected.layaway_payments || []).map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                      <span style={{ color: 'var(--text2)' }}>{p.payment_date} · {p.method}</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>

                {!['completado', 'cancelado'].includes(selected.status) && (
                  <button className="btn btn-primary" onClick={() => setShowPayment(true)}>
                    + Registrar pago
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Layaway Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nuevo apartado</span>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Cliente *</label>
                <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                  <option value="">Seleccionar cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Productos</div>
              {formItems.map((item, i) => (
                <div key={i} className="form-grid-3" style={{ alignItems: 'end' }}>
                  <div className="field">
                    <label>Producto</label>
                    <select value={item.variant_id} onChange={e => updateFormItem(i, 'variant_id', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {catalog.map(v => <option key={v.id} value={v.id}>{v.products?.name} — {v.color} {v.size}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Precio</label>
                    <input type="number" value={item.price} onChange={e => updateFormItem(i, 'price', e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div className="field" style={{ flex: 1 }}>
                      <label>Color</label>
                      <input value={item.color} onChange={e => updateFormItem(i, 'color', e.target.value)} />
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setFormItems(p => p.filter((_, idx) => idx !== i))}>✕</button>
                  </div>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={() => setFormItems(p => [...p, { variant_id: '', product_name: '', color: '', size: '', price: 0 }])}>
                + Agregar producto
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--border)', fontWeight: 700 }}>
                <span>Total:</span>
                <span className="text-accent">{fmt(formTotal)}</span>
              </div>

              <div className="field">
                <label>Anticipo (mín. {settings.layaway_min_pct}% = {fmt(minDown)})</label>
                <input
                  type="number"
                  value={form.down_payment}
                  onChange={e => setForm(f => ({ ...f, down_payment: e.target.value }))}
                  placeholder={fmt(minDown)}
                />
              </div>

              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                Vencimiento en {settings.layaway_days} días · Saldo a pagar: {fmt(formTotal - Number(form.down_payment || 0))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Guardando...' : 'Crear apartado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && selected && (
        <div className="modal-overlay" onClick={() => setShowPayment(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Registrar pago — {selected.code}</span>
              <button className="modal-close" onClick={() => setShowPayment(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
                Saldo pendiente: <strong className="text-accent">{fmt(selected.balance)}</strong>
              </div>
              <div className="field">
                <label>Monto *</label>
                <input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" max={selected.balance} />
              </div>
              <div className="field">
                <label>Método</label>
                <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPayment(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving} onClick={handlePayment}>
                {saving ? 'Guardando...' : 'Aplicar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
