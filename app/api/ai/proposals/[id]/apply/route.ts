import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(_req: Request, context: { params: { id: string } }) {
  const { id } = context.params
  const sb = await createServerSupabase() 

  const { data: p, error: e1 } = await sb.from('ai_proposals').select('*').eq('id', id).single()
  if (e1 || !p) return NextResponse.json({ error: e1?.message || 'Not found' }, { status: 404 })

  // TODO: apply proposal to your domain

  const { error: e2 } = await sb.from('ai_proposals').update({ status: 'applied' }).eq('id', id)
  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
