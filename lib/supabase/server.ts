// lib/supabase/server.ts
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export function createServerSupabase() {
  const cookieStore = cookies()
  const hdrs = headers()
  const authHeader = hdrs.get('authorization') // e.g. "Bearer eyJhbGciOi..."

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options?: any) {
          try { cookieStore.set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options?: any) {
          try { cookieStore.set({ name, value: '', ...options, maxAge: 0 }) } catch {}
        },
      },
      // If the client is created with a Bearer header, *all* subsequent calls
      // (auth.getUser, from(...).select, etc.) will run as that user.
      global: authHeader ? { headers: { Authorization: authHeader } } : {},
    }
  )
}
