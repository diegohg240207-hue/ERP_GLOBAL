import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import DashboardModule from './components/modules/DashboardModule'
import POSModule from './components/modules/POSModule'
import VentasModule from './components/modules/VentasModule'
import ProductosModule from './components/modules/ProductosModule'
import InventarioModule from './components/modules/InventarioModule'
import ClientesModule from './components/modules/ClientesModule'
import CreditosModule from './components/modules/CreditosModule'
import ComprasModule from './components/modules/ComprasModule'
import ApartadosModule from './components/modules/ApartadosModule'
import PagosModule from './components/modules/PagosModule'
import CorteCajaModule from './components/modules/CorteCajaModule'
import PromocionesModule from './components/modules/PromocionesModule'
import ReportesModule from './components/modules/ReportesModule'
import EtiquetasModule from './components/modules/EtiquetasModule'
import ConfiguracionModule from './components/modules/ConfiguracionModule'

const CAJERO_MODULES = new Set(['pos','clientes','apartados','creditos','pagos','cortecaja'])

function Layout() {
  const { profile, loading } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [activeModule, setActiveModule] = useState('dashboard')
  const [lang, setLang] = useState('es')
  const [dark, setDark] = useState(false)

  useEffect(() => {
    document.body.className = dark ? 'dark' : 'light'
  }, [dark])

  // Default module for cajero
  useEffect(() => {
    if (profile?.role === 'cajero' && !CAJERO_MODULES.has(activeModule)) {
      setActiveModule('pos')
    }
  }, [profile])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    )
  }

  const role = profile?.role || 'cajero'

  function navigate(moduleId) {
    if (role === 'cajero' && !CAJERO_MODULES.has(moduleId)) return
    setActiveModule(moduleId)
  }

  function renderModule() {
    const props = { lang, onNavigate: navigate }
    switch (activeModule) {
      case 'dashboard':    return role === 'admin' ? <DashboardModule {...props} /> : <POSModule {...props} />
      case 'pos':          return <POSModule {...props} />
      case 'ventas':       return <VentasModule {...props} />
      case 'productos':    return <ProductosModule {...props} />
      case 'inventario':   return <InventarioModule {...props} />
      case 'clientes':     return <ClientesModule {...props} />
      case 'creditos':     return <CreditosModule {...props} />
      case 'compras':      return <ComprasModule {...props} />
      case 'apartados':    return <ApartadosModule {...props} />
      case 'pagos':        return <PagosModule {...props} />
      case 'cortecaja':    return <CorteCajaModule {...props} />
      case 'promociones':  return <PromocionesModule {...props} />
      case 'reportes':     return <ReportesModule {...props} />
      case 'etiquetas':    return <EtiquetasModule {...props} />
      case 'configuracion':return <ConfiguracionModule {...props} />
      default:             return <DashboardModule {...props} />
    }
  }

  const isPOS = activeModule === 'pos'

  return (
    <div className="erp-root">
      <Sidebar
        collapsed={collapsed}
        active={activeModule}
        onNavigate={navigate}
      />
      <div className="main-area">
        <Topbar
          collapsed={collapsed}
          onToggle={() => setCollapsed(v => !v)}
          activeModule={activeModule}
          lang={lang}
          onLangChange={setLang}
          dark={dark}
          onDarkToggle={() => setDark(v => !v)}
        />
        {isPOS ? (
          renderModule()
        ) : (
          <div className="content">
            {renderModule()}
          </div>
        )}
      </div>
    </div>
  )
}

function AppInner() {
  const { user, loading } = useAuth()

  useEffect(() => {
    document.body.className = 'light'
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f6f9' }}>
        <div className="spinner" />
      </div>
    )
  }

  return user ? <Layout /> : <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <AppInner />
    </AuthProvider>
  )
}
