import { useAuth } from '../../contexts/AuthContext'

const MODULES = [
  { id:'dashboard',     icon:'⬡', labelEs:'Dashboard',       color:'#10b981' },
  { id:'pos',           icon:'⊡', labelEs:'POS',             color:'#f43f5e' },
  { id:'ventas',        icon:'◈', labelEs:'Ventas',          color:'#3b82f6' },
  { id:'productos',     icon:'▣', labelEs:'Productos',       color:'#84cc16' },
  { id:'inventario',    icon:'▦', labelEs:'Inventario',      color:'#f59e0b' },
  { id:'clientes',      icon:'◎', labelEs:'Clientes',        color:'#8b5cf6' },
  { id:'creditos',      icon:'◇', labelEs:'Créditos',        color:'#06b6d4' },
  { id:'compras',       icon:'◉', labelEs:'Compras',         color:'#f97316' },
  { id:'apartados',     icon:'◧', labelEs:'Apartados',       color:'#f43f5e' },
  { id:'pagos',         icon:'◑', labelEs:'Pagos',           color:'#14b8a6' },
  { id:'cortecaja',     icon:'◐', labelEs:'Corte de Caja',   color:'#a855f7' },
  { id:'promociones',   icon:'◬', labelEs:'Promociones',     color:'#ec4899' },
  { id:'reportes',      icon:'◈', labelEs:'Reportes',        color:'#e11d48' },
  { id:'etiquetas',     icon:'▥', labelEs:'Etiquetas',       color:'#0ea5e9' },
  { id:'configuracion', icon:'⚙', labelEs:'Configuración',   color:'#6b7280' },
]

const CAJERO_MODULES = new Set(['pos','clientes','apartados','creditos','pagos','cortecaja'])

export default function Sidebar({ collapsed, active, onNavigate }) {
  const { profile, signOut } = useAuth()
  const role = profile?.role || 'cajero'
  const name = profile?.name || 'Usuario'
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const visible = MODULES.filter(m => role === 'admin' || CAJERO_MODULES.has(m.id))

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">E</div>
        {!collapsed && <span className="sidebar-logo-text">ERP Global</span>}
      </div>

      <nav className="sidebar-nav">
        {visible.map(m => (
          <div
            key={m.id}
            className={`nav-item${active === m.id ? ' active' : ''}`}
            onClick={() => onNavigate(m.id)}
            title={collapsed ? m.labelEs : ''}
          >
            <span className="nav-icon" style={active === m.id ? { color: m.color } : {}}>{m.icon}</span>
            {!collapsed && <span className="nav-label">{m.labelEs}</span>}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{name}</div>
              <div className="sidebar-user-role">{role}</div>
            </div>
          )}
          {!collapsed && (
            <button className="sidebar-logout" onClick={signOut} title="Cerrar sesión">↩</button>
          )}
        </div>
        {collapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
            <button className="sidebar-logout" onClick={signOut} title="Cerrar sesión">↩</button>
          </div>
        )}
      </div>
    </aside>
  )
}
