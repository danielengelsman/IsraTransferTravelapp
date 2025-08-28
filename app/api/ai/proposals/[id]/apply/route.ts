import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(_req: Request, context: { params: { id: string } }) {
  const id = String(context?.params?.id || '')
  const sb = await createServerSupabase()

  // Load proposal
  const { data: p, error: e1 } = await sb
    .from('ai_proposals')
    .select('*')
    .eq('id', id)
    .single()

  if (e1 || !p) {
    return NextResponse.json({ error: e1?.message || 'Not found' }, { status: 404 })
  }

  // TODO: apply the proposal (insert flights/hotels/etc) based on p.kind / p.payload
  // Keep this minimal so the build passes; expand later.

  const { error: e2 } = await sb
    .from('ai_proposals')
    .update({ status: 'applied' })
    .eq('id', id)

  if (e2) {
    return NextResponse.json({ error: e2.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
