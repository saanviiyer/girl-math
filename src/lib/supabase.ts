import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client, created only when both env vars are present.
 *
 * When the env vars are missing (the zero-config default) `supabase` is null and
 * the app runs entirely in local/anonymous mode — see `repository.ts`. This keeps
 * the app building and running with no backend at all.
 */

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/** True when both Supabase env vars are configured. */
export const isSupabaseConfigured: boolean = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
