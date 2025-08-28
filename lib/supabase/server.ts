// lib/supabase/server.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function createServerSupabase() {
  // In Next 15 this is typed as Promise<ReadonlyRequestCookies>
  const store = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return store.get(name)?.value
        },
        set(name: string, value: string, options?: any) {
          // RequestCookies in route handlers supports set(name, value, options)
          try { store.set(name, value, options) } catch {}
        },
        remove(name: string, options?: any) {
          // emulate delete by setting maxAge=0
          try { store.set(name, '', { ...(options || {}), maxAge: 0 }) } catch {}
        },
      },
    }
  )
}
