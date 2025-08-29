// lib/supabase/server.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient as createBearerClient } from '@supabase/supabase-js'

const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** Cookies-based server client (App Router friendly) */
export function createServerSupabase() {
  const jar = cookies() // NOT async; returns RequestCookies
  return createServerClient(supaUrl, supaKey, {
    cookies: {
      get(name: string) { try { return jar.get(name)?.value } catch { return undefined } },
      set(name: string, value: string, options?: any) { try { jar.set({ name, value, ...options }) } catch {} },
      remove(name: string, options?: any) { try { jar.set({ name, value: '', ...options }) } catch {} },
    },
  })
}

/** Fallback: header Authorization: Bearer <token> */
export function createBearerSupabase(token: string) {
  return createBearerClient(supaUrl, supaKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
