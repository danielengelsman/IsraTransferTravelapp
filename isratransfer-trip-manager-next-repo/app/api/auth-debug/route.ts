import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const sb = await createClient()
  const { data, error } = await sb.auth.getUser()
  return NextResponse.json({ user: data?.user || null, error: error?.message || null })
}
