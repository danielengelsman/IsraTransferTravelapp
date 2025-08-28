import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_req: Request, context: { params: { id: string } }) {
  const sb = await createServerSupabase()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = context.params.id

  // Load proposal
  const { data: p, error: e1 } = await sb.from('ai_proposals').select('*').eq('id', id).single()
  if (e1 || !p) return NextResponse.json({ error: e1?.message || 'Not found' }, { status: 404 })

  // TODO: perform the actual changes based on p.kind/p.payload
  await sb.from('ai_proposals').update({ status: 'applied' }).eq('id', id)
  return NextResponse.json({ ok: true })
}
