import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = createServerSupabase(req)

  // auth
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = params.id

  // Load proposal (optional but useful to validate)
  const { data: proposal, error: pErr } = await sb
    .from('ai_proposals')
    .select('*')
    .eq('id', id)
    .single()

  if (pErr || !proposal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // TODO: materialize into your trips tables based on proposal.kind/payload
  // For now, mark as applied
  const { error: upErr } = await sb
    .from('ai_proposals')
    .update({ status: 'applied' })
    .eq('id', id)

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
