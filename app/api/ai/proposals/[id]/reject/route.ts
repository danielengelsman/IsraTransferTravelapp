import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(_req: Request, context: { params: { id: string } }) {
  const id = String(context?.params?.id || '')
  const sb = await createServerSupabase()

  const { error } = await sb
    .from('ai_proposals')
    .update({ status: 'rejected' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
