import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

export async function POST(_: Request, ctx: any) {
  const id = String(ctx?.params?.id)
  // ...
}
  const id = context.params.id
  const sb = createServerSupabase()
  const { error } = await sb.from('ai_proposals').update({ status: 'rejected' }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
