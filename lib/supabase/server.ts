// lib/supabase/server.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function createServerSupabase() {
  // Next 15: cookies() is async (Promise<ReadonlyRequestCookies>)
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
          try { store.set(name, value, options) } catch {}
        },
        remove(name: string, options?: any) {
          try { store.set(name, '', { ...(options || {}), maxAge: 0 }) } catch {}
        },
      },
    }
  )
}
