import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

type Ctx = { params: { id: string } }

export async function POST(req: Request, { params }: Ctx) {
  const sb = createServerSupabase()

  // 1) Try cookie auth
  let { data: { user } } = await sb.auth.getUser()

  // 2) Fallback to Authorization: Bearer <access_token>
  if (!user) {
    const hdr = req.headers.get('authorization') || ''
    if (hdr.toLowerCase().startsWith('bearer ')) {
      const token = hdr.slice(7)
      const { data } = await sb.auth.getUser(token)
      user = data?.user ?? null
    }
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = params.id

  // Load proposal
  const { data: p, error: e1 } = await sb
    .from('ai_proposals')
    .select('*')
    .eq('id', id)
    .single()

  if (e1 || !p) {
    return NextResponse.json({ error: e1?.message || 'Not found' }, { status: 404 })
  }

  // Apply it
  let err: string | null = null

  try {
    switch (p.kind) {
      case 'trip_update': {
        const { trip_id, ...fields } = (p.payload || {}) as any
        if (!trip_id) throw new Error('trip_id required')
        const { error } = await sb.from('trips').update(fields).eq('id', trip_id)
        if (error) throw error
        break
      }
      case 'flight': {
        const { error } = await sb.from('flights').insert(p.payload)
        if (error) throw error
        break
      }
      case 'accommodation': {
        const { error } = await sb.from('accommodations').insert(p.payload)
        if (error) throw error
        break
      }
      case 'transport': {
        const { error } = await sb.from('transports').insert(p.payload)
        if (error) throw error
        break
      }
      case 'event': {
        const { trip_id, ...ev } = (p.payload || {}) as any
        if (!trip_id) throw new Error('trip_id required')
        const r1 = await sb.from('trips').select('itinerary').eq('id', trip_id).single()
        if (r1.error) throw r1.error
        const list: any[] = Array.isArray(r1.data?.itinerary) ? r1.data.itinerary : []
        list.push({ id: String(Date.now()), ...ev })
        const r2 = await sb.from('trips').update({ itinerary: list }).eq('id', trip_id)
        if (r2.error) throw r2.error
        break
      }
      default:
        throw new Error('Unknown kind')
    }
  } catch (e: any) {
    err = e?.message || String(e)
  }

  if (err) return NextResponse.json({ error: err }, { status: 400 })

  await sb.from('ai_proposals').update({ status: 'applied' }).eq('id', id)
  return NextResponse.json({ ok: true })
}
