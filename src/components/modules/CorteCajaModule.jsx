import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  getTodayCashRegister, createCashRegister, updateCashRegister,
  addCashExpense, getCashRegisterHistory, getPayments
} from '../../services/db'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../common/StatusBadge'

const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
const fmtDiff = n => {
  const v = Number(n || 0)
  return (v >= 0 ? '+' : '') + fmt(Math.abs(v))
}

export default function CorteCajaModule({ lang }) {
  const { profile } = useAuth()
  const [register, setRegister] = useState(null)
  const [history, setHistory] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('hoy') // hoy | historia
  const [counted, setCounted] = useState({ cash: '', card: '', transfer: '', check: '' })
  const [expForm, setExpForm] = useState({ concept: '', amount: '' })
  const [saving, setSaving] = useState(false)
  const [opening, setOpening] = useState('')

  async function load() {
    const [reg, hist, pays] = await Promise.all([
      getTodayCashRegister(),
      getCashRegisterHistory(),
      getPayments('', '', )
    ])
    setRegister(reg)
    setHistory(hist)
    // Filter today's payments
    const today = new Date().toISOString().split('T')[0]
    setPayments(pays.filter(p => p.payment_date === today))
    if (reg) {
      setCounted({
        cash: reg.counted_cash ?? '',
        card: reg.counted_card ?? '',
        transfer: reg.counted_transfer ?? '',
        check: reg.counted_check ?? ''
      })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // System totals from payments
  const sysCash = payments.filter(p => p.method === 'efectivo').reduce((s, p) => s + Number(p.amount || 0), 0)
  const sysCard = payments.filter(p => p.method === 'tarjeta').reduce((s, p) => s + Number(p.amount || 0), 0)
  const sysTransfer = payments.filter(p => p.method === 'transferencia').reduce((s, p) => s + Number(p.amount || 0), 0)
  const sysCheck = payments.filter(p => p.method === 'cheque').reduce((s, p) => s + Number(p.amount || 0), 0)

  const diffCash = Number(counted.cash || 0) - sysCash
  const diffCard = Number(counted.card || 0) - sysCard
  const diffTransfer = Number(counted.transfer || 0) - sysTransfer
  const diffCheck = Number(counted.check || 0) - sysCheck

  const totalExpenses = register ? (register.cash_register_expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0) : 0

  async function openRegister() {
    if (!opening && opening !== '0') { toast.error('Ingresa el fondo inicial'); return }
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const reg = await createCashRegister({
        register_date: today,
        cashier_id: profile?.id || null,
        opening_float: Number(opening),
        status: 'abierto',
        sys_cash: 0, sys_card: 0, sys_transfer: 0, sys_check: 0,
        counted_cash: 0, counted_card: 0, counted_transfer: 0, counted_check: 0,
        total_expenses: 0
      })
      toast.success('Caja abierta')
      setRegister(reg)
      load()
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveCounted() {
    if (!register) return
    setSaving(true)
    try {
      await updateCashRegister(register.id, {
        counted_cash: Number(counted.cash || 0),
        counted_card: Number(counted.card || 0),
        counted_transfer: Number(counted.transfer || 0),
        counted_check: Number(counted.check || 0),
        sys_cash: sysCash,
        sys_card: sysCard,
        sys_transfer: sysTransfer,
        sys_check: sysCheck,
        total_expenses: totalExpenses
      })
      toast.success('Conteo guardado')
      load()
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function closeRegister() {
    if (!register) return
    setSaving(true)
    try {
      await updateCashRegister(register.id, { status: 'cerrado' })
      toast.success('Caja cerrada')
      load()
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function addExpense() {
    if (!expForm.concept || !expForm.amount) { toast.error('Completa los campos'); return }
    if (!register) return
    setSaving(true)
    try {
      await addCashExpense({ register_id: register.id, concept: expForm.concept, amount: Number(expForm.amount) })
      toast.success('Gasto registrado')
      setExpForm({ concept: '', amount: '' })
      load()
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Corte de Caja</div>
          <div className="page-sub">Control de efectivo y movimientos del día</div>
        </div>
        <div className="page-header-actions">
          <div className="view-tabs">
            <button className={`view-tab${tab === 'hoy' ? ' active' : ''}`} onClick={() => setTab('hoy')}>Hoy</button>
            <button className={`view-tab${tab === 'historia' ? ' active' : ''}`} onClick={() => setTab('historia')}>Historia</button>
          </div>
        </div>
      </div>

      {tab === 'hoy' ? (
        <div>
          {!register ? (
            <div className="card" style={{ maxWidth: 420 }}>
              <div className="card-header"><div className="card-title">Abrir caja</div></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label>Fondo inicial (efectivo)</label>
                  <input type="number" value={opening} onChange={e => setOpening(e.target.value)} placeholder="500.00" />
                </div>
                <button className="btn btn-primary" disabled={saving} onClick={openRegister}>
                  {saving ? 'Abriendo...' : 'Abrir caja'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusBadge status={register.status} lang={lang} />
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Fondo inicial: {fmt(register.opening_float)}</span>
                {register.profiles?.name && (
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Cajero: {register.profiles.name}</span>
                )}
                {register.status === 'abierto' && (
                  <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={closeRegister} disabled={saving}>
                    Cerrar caja
                  </button>
                )}
              </div>

              {/* Totals comparison */}
              <div className="card">
                <div className="card-header"><div className="card-title">Comparativo del día</div></div>
                <div className="card-body">
                  <table>
                    <thead>
                      <tr>
                        <th>Método</th>
                        <th>Sistema</th>
                        <th>Contado</th>
                        <th>Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Efectivo', sys: sysCash, field: 'cash' },
                        { label: 'Tarjeta', sys: sysCard, field: 'card' },
                        { label: 'Transferencia', sys: sysTransfer, field: 'transfer' },
                        { label: 'Cheque', sys: sysCheck, field: 'check' },
                      ].map(row => {
                        const diff = Number(counted[row.field] || 0) - row.sys
                        return (
                          <tr key={row.field}>
                            <td style={{ fontWeight: 600 }}>{row.label}</td>
                            <td>{fmt(row.sys)}</td>
                            <td>
                              {register.status === 'abierto' ? (
                                <input
                                  type="number"
                                  value={counted[row.field]}
                                  onChange={e => setCounted(c => ({ ...c, [row.field]: e.target.value }))}
                                  style={{ width: 120, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 13, color: 'var(--text)' }}
                                />
                              ) : fmt(register[`counted_${row.field === 'cash' ? 'cash' : row.field === 'card' ? 'card' : row.field === 'transfer' ? 'transfer' : 'check'}`] || 0)}
                            </td>
                            <td style={{ fontWeight: 700, color: Math.abs(diff) < 0.01 ? 'var(--accent)' : diff < 0 ? 'var(--danger)' : 'var(--warning)' }}>
                              {fmtDiff(diff)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {register.status === 'abierto' && (
                    <div style={{ marginTop: 14 }}>
                      <button className="btn btn-primary btn-sm" onClick={saveCounted} disabled={saving}>
                        {saving ? 'Guardando...' : 'Guardar conteo'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Expenses */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Gastos del día</div>
                  <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--danger)' }}>{fmt(totalExpenses)}</span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(register.cash_register_expenses || []).map((e, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>{e.concept}</span>
                      <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{fmt(e.amount)}</span>
                    </div>
                  ))}
                  {register.status === 'abierto' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <div className="field" style={{ flex: 1 }}>
                        <label>Concepto</label>
                        <input value={expForm.concept} onChange={e => setExpForm(f => ({ ...f, concept: e.target.value }))} placeholder="Descripción del gasto" />
                      </div>
                      <div className="field" style={{ width: 120 }}>
                        <label>Monto</label>
                        <input type="number" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={addExpense} disabled={saving}>+</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cajero</th>
                  <th>Fondo inicial</th>
                  <th>Efectivo (sis)</th>
                  <th>Tarjeta (sis)</th>
                  <th>Transf. (sis)</th>
                  <th>Gastos</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>Sin registros</td></tr>
                ) : history.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.register_date}</td>
                    <td>{r.profiles?.name || '—'}</td>
                    <td>{fmt(r.opening_float)}</td>
                    <td>{fmt(r.sys_cash)}</td>
                    <td>{fmt(r.sys_card)}</td>
                    <td>{fmt(r.sys_transfer)}</td>
                    <td style={{ color: 'var(--danger)' }}>{fmt(r.total_expenses)}</td>
                    <td><StatusBadge status={r.status} lang={lang} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
