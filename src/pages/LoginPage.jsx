import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56,
            background: 'var(--accent)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 26, fontWeight: 800, color: '#fff',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            boxShadow: '0 8px 24px var(--accent-glow)'
          }}>E</div>
          <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
            ERP Global
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sistema de gestión retail</p>
        </div>

        {/* Card */}
        <div className="card">
          <div className="card-body" style={{ padding: '28px 28px' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>
              Iniciar sesión
            </h2>

            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                ⚠ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field">
                <label htmlFor="email">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="field">
                <label htmlFor="password">Contraseña</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ marginTop: 8, width: '100%', justifyContent: 'center', padding: '10px 16px' }}
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          </div>
        </div>

        {/* Demo credentials */}
        <div style={{
          marginTop: 20,
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '14px 16px',
          fontSize: 12,
          color: 'var(--text3)',
          lineHeight: 1.7
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text2)', marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Credenciales demo
          </div>
          <div><strong style={{ color: 'var(--text2)' }}>Admin:</strong> admin@erp.com / admin123</div>
          <div><strong style={{ color: 'var(--text2)' }}>Cajero:</strong> cajero@erp.com / cajero123</div>
        </div>
      </div>
    </div>
  )
}
