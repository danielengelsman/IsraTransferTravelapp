// app/api/ai/proposals/[id]/reject/route.ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

async function requireUser(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7)
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )
    const { data, error } = await sb.auth.getUser(token)
    if (error || !data?.user) return null
    return data.user
  }
  const sb = await createServerSupabase()
  const { data } = await sb.auth.getUser()
  return data.user ?? null
}

export async function POST(req: Request, ctx: any) {
  const id = ctx?.params?.id as string
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const user = await requireUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = await createServerSupabase()
  const { error } = await sb.from('ai_proposals').update({ status: 'rejected' }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
