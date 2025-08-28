import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(_req: Request, context: any) {
  const { id } = (context?.params || {}) as { id: string }
  const sb = createServerSupabase()

  const { error } = await sb
    .from('ai_proposals')
    .update({ status: 'rejected' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
