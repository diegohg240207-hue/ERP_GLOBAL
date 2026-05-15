import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getSales, getCustomers, createSale, getPOSCatalog } from '../../services/db'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../common/StatusBadge'

const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const STATUSES = ['', 'pendiente', 'confirmada', 'entregada', 'cancelada']

function genCode() { return 'VTA-' + Date.now().toString(36).toUpperCase() }

export default function VentasModule({ lang }) {
  const { profile } = useAuth()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [view, setView] = useState('list') // list | kanban
  const [showForm, setShowForm] = useState(false)
  const [customers, setCustomers] = useState([])
  const [catalog, setCatalog] = useState([])
  const [form, setForm] = useState({ customer_id: '', payment_terms: 'efectivo', status: 'confirmada' })
  const [formItems, setFormItems] = useState([{ variant_id: '', product_name: '', qty: 1, unit_price: 0 }])
  const [saving, setSaving] = useState(false)

  async function load() {
    const data = await getSales(statusFilter, 100)
    setSales(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])
  useEffect(() => {
    getCustomers().then(setCustomers)
    getPOSCatalog().then(setCatalog)
  }, [])

  // KPIs
  const monthStart = new Date().toISOString().slice(0, 7) + '-01'
  const monthly = sales.filter(s => s.sale_date >= monthStart && s.status !== 'cancelada')
  const monthTotal = monthly.reduce((s, x) => s + Number(x.total || 0), 0)
  const avgTicket = monthly.length ? monthTotal / monthly.length : 0
  const active = sales.filter(s => s.status === 'pendiente' || s.status === 'confirmada').length

  function addFormItem() {
    setFormItems(prev => [...prev, { variant_id: '', product_name: '', qty: 1, unit_price: 0 }])
  }

  function updateFormItem(i, field, value) {
    setFormItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item
      if (field === 'variant_id') {
        const variant = catalog.find(v => v.id === value)
        return { ...item, variant_id: value, product_name: variant?.products?.name || '', unit_price: Number(variant?.products?.price || 0) }
      }
      return { ...item, [field]: value }
    }))
  }

  async function handleSave() {
    if (!formItems.some(i => i.product_name)) { toast.error('Agrega al menos un producto'); return }
    setSaving(true)
    try {
      const total = formItems.reduce((s, i) => s + i.qty * i.unit_price, 0)
      const saleData = {
        code: genCode(),
        customer_id: form.customer_id || null,
        salesperson_id: profile?.id || null,
        sale_date: new Date().toISOString().split('T')[0],
        total,
        status: form.status,
        payment_terms: form.payment_terms
      }
      const items = formItems.filter(i => i.product_name).map(i => ({
        product_variant_id: i.variant_id || null,
        product_name: i.product_name,
        color: '', size: '',
        qty: Number(i.qty),
        unit_price: Number(i.unit_price),
        total: Number(i.qty) * Number(i.unit_price)
      }))
      await createSale(saleData, items)
      toast.success('Venta creada')
      setShowForm(false)
      setForm({ customer_id: '', payment_terms: 'efectivo', status: 'confirmada' })
      setFormItems([{ variant_id: '', product_name: '', qty: 1, unit_price: 0 }])
      load()
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const kanbanCols = ['pendiente', 'confirmada', 'entregada', 'cancelada']

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Ventas</div>
          <div className="page-sub">Gestión de órdenes de venta</div>
        </div>
        <div className="page-header-actions">
          <div className="view-tabs">
            <button className={`view-tab${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>≡ Lista</button>
            <button className={`view-tab${view === 'kanban' ? ' active' : ''}`} onClick={() => setView('kanban')}>⬚ Kanban</button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nueva venta</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total mensual</div>
          <div className="kpi-value">{fmt(monthTotal)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ticket promedio</div>
          <div className="kpi-value">{fmt(avgTicket)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Órdenes activas</div>
          <div className="kpi-value">{active}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total mes ({monthly.length})</div>
          <div className="kpi-value">{monthly.length}</div>
          <div className="kpi-sub">ventas este mes</div>
        </div>
      </div>

      {/* Filters */}
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
        view === 'list' ? (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Cliente</th>
                    <th>Vendedor</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Forma pago</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>Sin ventas</td></tr>
                  ) : sales.map(s => (
                    <tr key={s.id}>
                      <td><span className="text-accent" style={{ fontWeight: 600 }}>{s.code || s.id?.slice(0,8)}</span></td>
                      <td>{s.customers?.name || '—'}</td>
                      <td>{s.profiles?.name || '—'}</td>
                      <td>{s.sale_date}</td>
                      <td style={{ fontWeight: 600 }}>{fmt(s.total)}</td>
                      <td style={{ textTransform: 'capitalize' }}>{s.payment_terms || '—'}</td>
                      <td><StatusBadge status={s.status} lang={lang} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="kanban-board">
            {kanbanCols.map(col => {
              const colSales = sales.filter(s => s.status === col)
              return (
                <div key={col} className="kanban-col">
                  <div className="kanban-col-header">
                    <span>{col.charAt(0).toUpperCase() + col.slice(1)}</span>
                    <span className="badge badge-gray">{colSales.length}</span>
                  </div>
                  {colSales.map(s => (
                    <div key={s.id} className="kanban-card">
                      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--accent)' }}>{s.code || s.id?.slice(0,8)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', margin: '4px 0' }}>{s.customers?.name || 'Sin cliente'}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{fmt(s.total)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{s.sale_date}</div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* New Sale Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nueva venta</span>
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
                  <label>Forma de pago</label>
                  <select value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))}>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="credito">Crédito</option>
                  </select>
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Productos</div>
              {formItems.map((item, i) => (
                <div key={i} className="form-grid-3" style={{ alignItems: 'end' }}>
                  <div className="field">
                    <label>Producto</label>
                    <select value={item.variant_id} onChange={e => updateFormItem(i, 'variant_id', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {catalog.map(v => <option key={v.id} value={v.id}>{v.products?.name} - {v.color} {v.size}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Cantidad</label>
                    <input type="number" min={1} value={item.qty} onChange={e => updateFormItem(i, 'qty', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Precio unit.</label>
                    <input type="number" value={item.unit_price} onChange={e => updateFormItem(i, 'unit_price', e.target.value)} />
                  </div>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={addFormItem}>+ Agregar línea</button>

              <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                Total: {fmt(formItems.reduce((s, i) => s + Number(i.qty) * Number(i.unit_price), 0))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Guardando...' : 'Crear venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
