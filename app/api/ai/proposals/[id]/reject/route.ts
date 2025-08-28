import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

type Ctx = { params: { id: string } }

export async function POST(req: Request, { params }: Ctx) {
  const sb = createServerSupabase()

  // cookie auth
  let { data: { user } } = await sb.auth.getUser()

  // bearer fallback
  if (!user) {
    const hdr = req.headers.get('authorization') || ''
    if (hdr.toLowerCase().startsWith('bearer ')) {
      const token = hdr.slice(7)
      const { data } = await sb.auth.getUser(token)
      user = data?.user ?? null
    }
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await sb.from('ai_proposals').update({ status: 'rejected' }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
