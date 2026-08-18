import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'

export interface AuthState {
  /** Whether Supabase is wired up at all. When false the app is local-only. */
  configured: boolean
  /** Still resolving the initial session. */
  loading: boolean
  user: User | null
  session: Session | null
  /** Send a magic-link / OTP email. Resolves when the mail is dispatched. */
  signInWithEmail: (email: string) => Promise<void>
  signOut: () => Promise<void>
  displayName: string
  updateProfile: (displayName: string) => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let active = true

    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (active) setSession(data.session)
      } catch (error) {
        console.error('[girl-math] session restore failed', error)
      } finally {
        if (active) setLoading(false)
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signInWithEmail = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const updateProfile = useCallback(async (displayName: string) => {
    if (!supabase) throw new Error('Supabase is not configured')
    const name = displayName.trim().slice(0, 80)
    const { error } = await supabase.auth.updateUser({ data: { display_name: name } })
    if (error) throw error
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      user: session?.user ?? null,
      session,
      signInWithEmail,
      signOut,
      displayName: typeof session?.user.user_metadata.display_name === 'string' ? session.user.user_metadata.display_name : '',
      updateProfile,
    }),
    [loading, session, signInWithEmail, signOut, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
