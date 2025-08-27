'use client'

// Use the plain browser SDK so the session is kept in localStorage
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,       // keep you logged in
        autoRefreshToken: true,     // refresh tokens automatically
        detectSessionInUrl: true,   // handles URL tokens if any
      },
    }
  )
}
