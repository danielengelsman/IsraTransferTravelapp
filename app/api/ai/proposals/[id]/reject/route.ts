import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

function getTokenFromRequest(req: Request) {
  const auth = req.headers.get('authorization') || ''
  if (/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '')
  const cookie = req.headers.get('cookie') || ''
  const m = cookie.match(/(?:^|;\s*)sb-access-token=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

export async function POST(req: Request, ctx: any) {
  const id = ctx?.params?.id as string | undefined
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const token = getTokenFromRequest(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  // Optional: explicit user check
  const { data: userRes, error: userErr } = await sb.auth.getUser()
  if (userErr || !userRes?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await sb.from('ai_proposals').update({ status: 'rejected' }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
