import { useState, useEffect } from 'react'
import { getNotifications, markNotificationRead } from '../../services/db'

const MODULE_LABELS = {
  dashboard: 'Dashboard',
  pos: 'POS — Punto de Venta',
  ventas: 'Ventas',
  productos: 'Productos',
  inventario: 'Inventario',
  clientes: 'Clientes',
  creditos: 'Créditos',
  compras: 'Compras',
  apartados: 'Apartados',
  pagos: 'Pagos',
  cortecaja: 'Corte de Caja',
  promociones: 'Promociones',
  reportes: 'Reportes',
  etiquetas: 'Etiquetas',
  configuracion: 'Configuración',
}

export default function Topbar({ collapsed, onToggle, activeModule, lang, onLangChange, dark, onDarkToggle }) {
  const [notifs, setNotifs] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)

  useEffect(() => {
    getNotifications().then(setNotifs)
  }, [])

  const unread = notifs.filter(n => !n.read).length

  async function handleNotifClick(n) {
    if (!n.read) {
      await markNotificationRead(n.id)
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
    }
  }

  return (
    <header className="topbar">
      <button className="topbar-collapse-btn" onClick={onToggle} title={collapsed ? 'Expandir' : 'Colapsar'}>
        {collapsed ? '☰' : '✕'}
      </button>

      <span className="topbar-breadcrumb">{MODULE_LABELS[activeModule] || activeModule}</span>

      <input
        className="topbar-search"
        placeholder="Buscar..."
        type="search"
      />

      <div className="topbar-right">
        <button
          className={`topbar-btn${lang === 'es' ? ' active' : ''}`}
          onClick={() => onLangChange('es')}
        >ES</button>
        <button
          className={`topbar-btn${lang === 'en' ? ' active' : ''}`}
          onClick={() => onLangChange('en')}
        >EN</button>

        <button className="topbar-btn" onClick={onDarkToggle} title={dark ? 'Modo claro' : 'Modo oscuro'}>
          {dark ? '☀' : '☾'}
        </button>

        <div style={{ position: 'relative' }}>
          <button
            className="topbar-btn"
            onClick={() => setShowNotifs(v => !v)}
            title="Notificaciones"
          >
            🔔
            {unread > 0 && <span className="notif-badge">{unread}</span>}
          </button>

          {showNotifs && (
            <div style={{
              position: 'absolute', right: 0, top: '110%', zIndex: 50,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, width: 300, boxShadow: 'var(--shadow-md)',
              maxHeight: 360, overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, color: 'var(--text)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Notificaciones
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {notifs.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                    Sin notificaciones
                  </div>
                ) : notifs.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    style={{
                      padding: '10px 16px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: n.read ? 'transparent' : 'var(--accent-dim)',
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                      {lang === 'en' ? n.title_en : n.title_es}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {lang === 'en' ? n.meta_en : n.meta_es}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
