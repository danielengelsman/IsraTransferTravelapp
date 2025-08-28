// app/api/ai/proposals/[id]/apply/route.ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// Validate the user using either Authorization: Bearer <jwt> or cookies
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

  // Load proposal
  const { data: p, error: e1 } = await sb.from('ai_proposals').select('*').eq('id', id).single()
  if (e1 || !p) return NextResponse.json({ error: e1?.message || 'Not found' }, { status: 404 })

  // OPTIONAL: enforce ownership if you store user_id on proposals
  // if (p.user_id && p.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Do your "apply" logic here. For now, just mark applied.
  const { error: e2 } = await sb.from('ai_proposals').update({ status: 'applied' }).eq('id', id)
  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
