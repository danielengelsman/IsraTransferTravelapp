import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function createServerSupabase() {
  // Sometimes types mark cookies() oddly on Netlify; cast & await keeps TS happy.
  const store = (await (cookies() as any)) as ReturnType<typeof cookies>

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
