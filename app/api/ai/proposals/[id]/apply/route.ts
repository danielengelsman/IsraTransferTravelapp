// app/api/ai/proposals/[id]/apply/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(_req: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params
  const sb = createServerSupabase()

  const { data: userData, error: userErr } = await sb.auth.getUser()
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Mark proposal as applied (keep your richer logic if you already have it)
  const { error } = await sb
    .from('ai_proposals')
    .update({ status: 'applied' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
