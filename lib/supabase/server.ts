// lib/supabase/server.ts
import { cookies, type CookieOptions } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export function createServerSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Call cookies() at call time (works in Next 15 / Netlify)
        get(name: string) {
          return cookies().get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookies().set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookies().set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )
}
