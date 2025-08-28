// app/api/ai/proposals/[id]/apply/route.ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(_req: Request, ctx: any) {
  const id = ctx?.params?.id as string
  const sb = await createServerSupabase()

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load proposal
  const { data: p, error: e1 } = await sb
    .from('ai_proposals')
    .select('*')
    .eq('id', id)
    .single()
  if (e1 || !p) return NextResponse.json({ error: e1?.message || 'Not found' }, { status: 404 })

  let err: string | null = null
  try {
    switch (p.kind) {
      case 'trip_update':
        if (!p.patch) throw new Error('Missing patch')
        await sb.from('trips').update(p.patch).eq('id', p.trip_id)
        break
      case 'flight_add':
        if (!p.payload) throw new Error('Missing payload')
        await sb.from('flights').insert({ ...p.payload, trip_id: p.trip_id })
        break
      case 'accommodation_add':
        if (!p.payload) throw new Error('Missing payload')
        await sb.from('accommodations').insert({ ...p.payload, trip_id: p.trip_id })
        break
      case 'transport_add':
        if (!p.payload) throw new Error('Missing payload')
        await sb.from('transports').insert({ ...p.payload, trip_id: p.trip_id })
        break
      default:
        err = 'Unknown kind'
    }
  } catch (e: any) {
    err = e?.message || 'Apply failed'
  }

  if (err) return NextResponse.json({ error: err }, { status: 400 })

  await sb.from('ai_proposals').update({ status: 'applied' }).eq('id', id)
  return NextResponse.json({ ok: true })
}
