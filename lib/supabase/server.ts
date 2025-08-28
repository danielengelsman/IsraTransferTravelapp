// /lib/supabase/server.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export function createServerSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // NOTE: We call cookies() inside each method and cast to any to
      // work around Next 15 environments where cookies() may be typed
      // as Promise<ReadonlyRequestCookies>.
      cookies: {
        get(name: string) {
          try {
            const store: any = (cookies as any)() // may be sync in some runtimes
            return store?.get?.(name)?.value
          } catch {
            return undefined
          }
        },
        set(name: string, value: string, options?: any) {
          try {
            const store: any = (cookies as any)()
            store?.set?.({ name, value, ...options })
          } catch {
            /* no-op serverless fallback */
          }
        },
        remove(name: string, options?: any) {
          try {
            const store: any = (cookies as any)()
            store?.set?.({ name, value: '', ...options })
          } catch {
            /* no-op serverless fallback */
          }
        },
      },
    }
  )
}
