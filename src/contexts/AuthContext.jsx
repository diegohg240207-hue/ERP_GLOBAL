import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Single source of truth: onAuthStateChange fires INITIAL_SESSION on mount,
    // so getSession() is redundant and causes race conditions.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', u.id)
            .single()
          setProfile(!error && data ? data : null)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    // Don't load profile here — onAuthStateChange(SIGNED_IN) handles it cleanly
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    // Set loading=true to prevent flash of wrong UI during transition
    setLoading(true)
    await supabase.auth.signOut()
    // onAuthStateChange(SIGNED_OUT) will clear user/profile and set loading=false
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
