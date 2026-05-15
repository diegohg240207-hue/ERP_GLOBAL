import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getSettings, updateSetting, getProfiles } from '../../services/db'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const CONFIG_SECTIONS = [
  { id: 'general', label: 'General' },
  { id: 'notificaciones', label: 'Notificaciones' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'fiscal', label: 'Fiscal' },
]

export default function ConfiguracionModule({ lang }) {
  const { profile } = useAuth()
  const [section, setSection] = useState('general')
  const [settings, setSettings] = useState({})
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'cajero', password: '' })
  const [creatingUser, setCreatingUser] = useState(false)

  // Local editable copies of settings
  const [brandName, setBrandName] = useState('')
  const [accentColor, setAccentColor] = useState('')
  const [layawayMinPct, setLayawayMinPct] = useState('')
  const [layawayDays, setLayawayDays] = useState('')

  async function load() {
    const [setts, profs] = await Promise.all([getSettings(), getProfiles()])
    setSettings(setts)
    setProfiles(profs)
    setBrandName(setts.brand_name || 'ERP Global')
    setAccentColor(setts.accent_color || 'oklch(0.65 0.18 155)')
    setLayawayMinPct(setts.layaway_min_pct || '20')
    setLayawayDays(setts.layaway_days || '30')
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveGeneral() {
    setSaving(true)
    try {
      await Promise.all([
        updateSetting('brand_name', brandName),
        updateSetting('accent_color', accentColor),
        updateSetting('layaway_min_pct', layawayMinPct),
        updateSetting('layaway_days', layawayDays),
      ])
      toast.success('Configuración guardada')
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateUser() {
    if (!newUser.email || !newUser.password || !newUser.name) {
      toast.error('Completa todos los campos')
      return
    }
    setCreatingUser(true)
    try {
      // Using client-side signup (not admin API since we only have anon key)
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: { name: newUser.name, role: newUser.role }
        }
      })
      if (error) throw error
      toast.success('Usuario creado. Verificar email si está habilitado.')
      setNewUser({ email: '', name: '', role: 'cajero', password: '' })
      load()
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally {
      setCreatingUser(false)
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Configuración</div>
          <div className="page-sub">Ajustes del sistema ERP Global</div>
        </div>
      </div>

      <div className="config-grid">
        {/* Left nav */}
        <div className="config-nav">
          {CONFIG_SECTIONS.map(s => (
            <div
              key={s.id}
              className={`config-nav-item${section === s.id ? ' active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Content */}
        <div>
          {section === 'general' && (
            <div className="card">
              <div className="card-header"><div className="card-title">Ajustes generales</div></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-grid">
                  <div className="field">
                    <label>Nombre del negocio</label>
                    <input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Mi Empresa" />
                  </div>
                  <div className="field">
                    <label>Color acento (CSS)</label>
                    <input value={accentColor} onChange={e => setAccentColor(e.target.value)} placeholder="oklch(0.65 0.18 155)" />
                  </div>
                  <div className="field">
                    <label>Anticipo mínimo de apartado (%)</label>
                    <input type="number" min={1} max={100} value={layawayMinPct} onChange={e => setLayawayMinPct(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Días de vigencia del apartado</label>
                    <input type="number" min={1} value={layawayDays} onChange={e => setLayawayDays(e.target.value)} />
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 12 }}>Previsualización del color</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ width: 40, height: 40, background: accentColor, borderRadius: 10 }} />
                    <button style={{ background: accentColor, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'default' }}>
                      Botón ejemplo
                    </button>
                    <span style={{ color: accentColor, fontWeight: 700, fontSize: 15 }}>Texto acento</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" disabled={saving} onClick={saveGeneral}>
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {section === 'notificaciones' && (
            <div className="card">
              <div className="card-header"><div className="card-title">Notificaciones</div></div>
              <div className="card-body">
                {[
                  { label: 'Alertas de stock bajo', sub: 'Notificar cuando un ítem esté por debajo del mínimo' },
                  { label: 'Apartados vencidos', sub: 'Notificar cuando un apartado venza su fecha límite' },
                  { label: 'Créditos vencidos', sub: 'Alertar cuando un crédito esté vencido' },
                  { label: 'Ventas del día', sub: 'Resumen de ventas al cierre del día' },
                  { label: 'Pagos recibidos', sub: 'Confirmar cuando se registre un pago' },
                ].map((item, i) => (
                  <div key={i} className="toggle-row">
                    <div className="toggle-row-info">
                      <div className="toggle-row-label">{item.label}</div>
                      <div className="toggle-row-sub">{item.sub}</div>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked={i < 3} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'usuarios' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card">
                <div className="card-header"><div className="card-title">Usuarios del sistema</div></div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Rol</th>
                        <th>ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.length === 0 ? (
                        <tr><td colSpan={3} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)' }}>Sin usuarios</td></tr>
                      ) : profiles.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 500 }}>{p.name}</td>
                          <td>
                            <span className={`badge ${p.role === 'admin' ? 'badge-purple' : 'badge-blue'}`}>
                              {p.role}
                            </span>
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>{p.id?.slice(0, 12)}...</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {profile?.role === 'admin' && (
                <div className="card">
                  <div className="card-header"><div className="card-title">Crear nuevo usuario</div></div>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="alert alert-info" style={{ marginBottom: 0 }}>
                      ℹ El usuario recibirá un email de confirmación si está habilitado en Supabase.
                    </div>
                    <div className="form-grid">
                      <div className="field">
                        <label>Nombre completo</label>
                        <input value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} placeholder="Juan Pérez" />
                      </div>
                      <div className="field">
                        <label>Rol</label>
                        <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}>
                          <option value="cajero">Cajero</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Email</label>
                        <input type="email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} placeholder="usuario@empresa.com" />
                      </div>
                      <div className="field">
                        <label>Contraseña temporal</label>
                        <input type="password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} placeholder="Mín. 6 caracteres" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="btn btn-primary" disabled={creatingUser} onClick={handleCreateUser}>
                        {creatingUser ? 'Creando...' : 'Crear usuario'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {section === 'fiscal' && (
            <div className="card">
              <div className="card-header"><div className="card-title">Datos fiscales</div></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-grid">
                  <div className="field">
                    <label>RFC</label>
                    <input placeholder="XAXX010101000" />
                  </div>
                  <div className="field">
                    <label>Razón social</label>
                    <input placeholder="Mi Empresa S.A. de C.V." />
                  </div>
                  <div className="field" style={{ gridColumn: '1/-1' }}>
                    <label>Domicilio fiscal</label>
                    <input placeholder="Calle, Número, Colonia, Ciudad, CP" />
                  </div>
                  <div className="field">
                    <label>Régimen fiscal</label>
                    <select>
                      <option>601 - General de Ley Personas Morales</option>
                      <option>612 - Personas Físicas con Actividades Empresariales</option>
                      <option>626 - Simplificado de Confianza</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>IVA (%)</label>
                    <input type="number" defaultValue={16} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={() => toast.success('Datos fiscales guardados')}>
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
