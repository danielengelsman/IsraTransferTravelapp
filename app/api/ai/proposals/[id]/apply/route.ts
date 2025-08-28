import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// NOTE: use `context: any` to avoid Next's strict signature check complaints
export async function POST(_req: Request, context: any) {
  const sb = await createServerSupabase()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = context?.params?.id as string
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Load proposal
  const { data: p, error: e1 } = await sb.from('ai_proposals').select('*').eq('id', id).single()
  if (e1 || !p) return NextResponse.json({ error: e1?.message || 'Not found' }, { status: 404 })

  // TODO: perform actual inserts/updates based on p.kind / p.payload
  const { error: e2 } = await sb.from('ai_proposals').update({ status: 'applied' }).eq('id', id)
  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
