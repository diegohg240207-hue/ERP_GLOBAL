import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // onAuthStateChange callback MUST be synchronous (no await).
  // Supabase v2 holds an internal lock while dispatching auth events.
  // Calling supabase.from() inside the callback tries to acquire the same lock → deadlock.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (!u) {
        // No session → immediately done
        setProfile(null)
        setLoading(false)
      }
      // If user exists: loading stays true until profile effect below resolves it
    })
    return () => subscription.unsubscribe()
  }, [])

  // Profile loader — runs outside the auth lock, safe to await Supabase queries
  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (!cancelled) {
        setProfile(!error && data ? data : null)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    setLoading(true)
    await supabase.auth.signOut()
    // onAuthStateChange(SIGNED_OUT) will set user=null, profile=null, loading=false
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
