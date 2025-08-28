// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies as nextCookies } from 'next/headers'

export async function createServerSupabase() {
  // In your environment, cookies() is typed/promised — await it
  const cookieStore: any = await (nextCookies() as any)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        get(name: string) {
          try {
            return cookieStore.get(name)?.value
          } catch {
            return undefined
          }
        },
        set(name: string, value: string, options?: any) {
          // Support both signatures across Next versions
          try {
            cookieStore.set(name, value, options)
          } catch {
            try {
              cookieStore.set({ name, value, ...(options || {}) })
            } catch {}
          }
        },
        remove(name: string, options?: any) {
          try {
            cookieStore.delete(name)
          } catch {
            // Fallback: overwrite
            try {
              cookieStore.set({ name, value: '', ...(options || {}) })
            } catch {}
          }
        },
      },
    }
  )

  return supabase
}
