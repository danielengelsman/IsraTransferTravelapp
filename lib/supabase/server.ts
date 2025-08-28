// lib/supabase/server.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function createServerSupabase() {
  // Next 15 in your runtime makes cookies() async -> await it
  const store = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try { return store.get(name)?.value } catch { return undefined }
        },
        set(name: string, value: string, options?: any) {
          try { store.set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options?: any) {
          try { store.set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )
}
