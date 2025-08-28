import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const sb = createServerSupabase()

  // Example: require auth for AI chat (optional)
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // TODO: read body and call your model, etc.
  const _body = await req.json().catch(() => ({}))

  return NextResponse.json({ ok: true }) // placeholder response
}
