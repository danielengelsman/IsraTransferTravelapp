// app/api/ai/proposals/[id]/apply/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function sbFrom(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : undefined
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: jwt ? { Authorization: `Bearer ${jwt}` } : {} },
  })
}

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  ctx: { params: Record<string, string | string[]> } // ✅ Next 15-compatible
) {
  const sb = sbFrom(req)
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const idParam = ctx.params?.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data: p, error: getErr } = await sb.from('ai_proposals').select('*').eq('id', id).single()
  if (getErr || !p) return NextResponse.json({ error: getErr?.message || 'Not found' }, { status: 404 })
  if (p.status === 'applied') return NextResponse.json({ ok: true })

  let err: string | null = null
  try {
    switch (p.kind as string) {
      case 'trip': {
        const pl = p.payload || {}
        const row: any = { title: pl.title ?? p.summary ?? 'New Trip' }
        if (pl.start_date) row.start_date = pl.start_date
        if (pl.end_date) row.end_date = pl.end_date
        if (pl.notes) row.notes = pl.notes
        const { error } = await sb.from('trips').insert(row)
        if (error) err = error.message
        break
      }
      case 'accommodation': {
        const pl = p.payload || {}
        const { error } = await sb.from('accommodations').insert({
          trip_id: p.trip_id,
          name: pl.name,
          address: pl.address,
          check_in: pl.check_in,
          check_out: pl.check_out,
          notes: pl.notes,
        })
        if (error) err = error.message
        break
      }
      case 'transport': {
        const pl = p.payload || {}
        const { error } = await sb.from('transports').insert({
          trip_id: p.trip_id,
          mode: pl.mode,
          from_city: pl.from_city,
          to_city: pl.to_city,
          depart_at: pl.depart_at,
          arrive_at: pl.arrive_at,
          carrier: pl.carrier,
          code: pl.code,
          notes: pl.notes,
        })
        if (error) err = error.message
        break
      }
      case 'itinerary_event': {
        const pl = p.payload || {}
        const { error } = await sb.from('itinerary_events').insert({
          trip_id: p.trip_id,
          title: pl.title ?? p.summary,
          date: pl.date,
          start_time: pl.start_time,
          end_time: pl.end_time,
          location: pl.location,
          notes: pl.notes,
        })
        if (error) err = error.message
        break
      }
      case 'note': {
        const pl = p.payload || {}
        const { error } = await sb.from('notes').insert({
          trip_id: p.trip_id,
          content: pl.content ?? p.summary,
        })
        if (error) err = error.message
        break
      }
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
