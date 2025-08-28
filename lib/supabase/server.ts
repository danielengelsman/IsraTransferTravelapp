// lib/supabase/server.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

/** Create a Supabase server client that reads cookies and (if present)
 * forwards the Authorization header from the incoming request. */
export function createServerSupabase(req?: Request) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try { return cookies().get(name)?.value } catch { return undefined }
        },
        set(name: string, value: string, options?: any) {
          try { cookies().set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options?: any) {
          try { cookies().set({ name, value: '', ...options, maxAge: 0 }) } catch {}
        },
      },
      global: {
        headers: {
          ...(req?.headers?.get('authorization')
            ? { Authorization: req.headers.get('authorization')! }
            : {}),
        },
      },
    }
  )
}
