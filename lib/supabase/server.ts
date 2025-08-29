// lib/supabase/server.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

/**
 * Server-side Supabase client (Next.js 15 compatible).
 * - Uses async cookies() API
 * - Safe no-op try/catch around cookie read/write in edge/route contexts
 */
export async function createServerSupabase() {
  const store = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try {
            return store.get(name)?.value
          } catch {
            return undefined
          }
        },
        set(name: string, value: string, options?: any) {
          try {
            store.set({ name, value, ...options })
          } catch {
            /* noop */
          }
        },
        remove(name: string, options?: any) {
          try {
            store.set({ name, value: '', expires: new Date(0), ...options })
          } catch {
            /* noop */
          }
        },
      },
    }
  )
}
