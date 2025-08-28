// lib/supabase/server.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export function createServerSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value
        },
        set(name: string, value: string, options?: any) {
          // Next exposes set(name, value, options)
          cookies().set(name, value, options as any)
        },
        remove(name: string, options?: any) {
          // No explicit delete API — set an expired cookie instead
          cookies().set(name, '', { ...(options || {}), maxAge: 0 })
        },
      },
    }
  )
}
