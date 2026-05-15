import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getCustomers, createCustomer } from '../../services/db'
import StatusBadge from '../common/StatusBadge'

const SEGMENTS = ['', 'A', 'B', 'C']

export default function ClientesModule({ lang }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [segment, setSegment] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', contact: '', email: '', phone: '', segment: 'B' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const data = await getCustomers(segment)
    setCustomers(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [segment])

  const filtered = customers.filter(c => {
    if (!search) return true
    const s = search.toLowerCase()
    return (c.name || '').toLowerCase().includes(s) ||
      (c.code || '').toLowerCase().includes(s) ||
      (c.email || '').toLowerCase().includes(s)
  })

  async function handleSave() {
    if (!form.name) { toast.error('Nombre requerido'); return }
    setSaving(true)
    try {
      await createCustomer(form)
      toast.success('Cliente creado')
      setShowForm(false)
      setForm({ name: '', code: '', contact: '', email: '', phone: '', segment: 'B' })
      load()
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const countA = customers.filter(c => c.segment === 'A').length
  const countB = customers.filter(c => c.segment === 'B').length
  const countC = customers.filter(c => c.segment === 'C').length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Clientes</div>
          <div className="page-sub">{customers.length} clientes registrados</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nuevo cliente</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total clientes</div>
          <div className="kpi-value">{customers.length}</div>
          <span className="kpi-icon">◎</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Segmento A (VIP)</div>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>{countA}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Segmento B</div>
          <div className="kpi-value">{countB}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Segmento C</div>
          <div className="kpi-value">{countC}</div>
        </div>
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Buscar nombre, código, email..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="filter-chips">
          {SEGMENTS.map(s => (
            <span key={s} className={`chip${segment === s ? ' active' : ''}`} onClick={() => setSegment(s)}>
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
                  <th>Nombre</th>
                  <th>Contacto</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Segmento</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>Sin clientes</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id}>
                    <td><span className="text-accent" style={{ fontWeight: 600 }}>{c.code || '—'}</span></td>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td>{c.contact || '—'}</td>
                    <td style={{ color: 'var(--text2)' }}>{c.email || '—'}</td>
                    <td>{c.phone || '—'}</td>
                    <td><StatusBadge status={c.segment} lang={lang} /></td>
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
              <span className="modal-title">Nuevo cliente</span>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Nombre *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre completo o empresa" />
                </div>
                <div className="field">
                  <label>Código</label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="CLI-001" />
                </div>
                <div className="field">
                  <label>Segmento</label>
                  <select value={form.segment} onChange={e => setForm(f => ({ ...f, segment: e.target.value }))}>
                    <option value="A">A — VIP</option>
                    <option value="B">B — Regular</option>
                    <option value="C">C — Ocasional</option>
                  </select>
                </div>
                <div className="field">
                  <label>Contacto</label>
                  <input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="Nombre del contacto" />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" />
                </div>
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Teléfono</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+52 55 0000 0000" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Guardando...' : 'Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
