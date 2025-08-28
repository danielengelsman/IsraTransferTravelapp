import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// NOTE: the second arg MUST NOT be typed to a specific shape.
// Use `any` and then extract params.
export async function POST(req: NextRequest, ctx: any) {
  const { id } = (ctx?.params ?? {}) as { id: string }

  const sb = createServerSupabase(req)
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // (optional) validate it exists
  const { data: proposal, error: pErr } = await sb
    .from('ai_proposals')
    .select('*')
    .eq('id', id)
    .single()

  if (pErr || !proposal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // TODO: materialize into trips tables according to `proposal.kind/payload`
  const { error: upErr } = await sb
    .from('ai_proposals')
    .update({ status: 'applied' })
    .eq('id', id)

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
