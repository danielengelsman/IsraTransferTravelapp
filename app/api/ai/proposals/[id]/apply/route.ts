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
function getIdFromUrl(url: string) {
  const parts = new URL(url).pathname.split('/') // .../proposals/:id/apply
  const i = parts.indexOf('proposals')
  return i >= 0 ? parts[i + 1] : ''
}

export async function POST(req: Request) {
  const sb = sbFrom(req)
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = getIdFromUrl(req.url)
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data: p, error } = await sb.from('ai_proposals')
    .select('id, trip_id, kind, summary, payload, status')
    .eq('id', id)
    .single()
  if (error || !p) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  if (p.status === 'applied') return NextResponse.json({ ok: true, already: true })

  try {
    let created: any = null
    switch (p.kind) {
      case 'trip': {
        const { data, error: e } = await sb.from('trips')
          .insert({
            title: p.payload?.title ?? p.summary ?? 'New Trip',
            start_date: p.payload?.start_date ?? null,
            end_date: p.payload?.end_date ?? null,
            notes: p.payload?.notes ?? null,
          }).select('id, title').single()
        if (e) throw e
        created = { table: 'trips', record: data }
        break
      }
      case 'accommodation': {
        const { data, error: e } = await sb.from('accommodations')
          .insert({
            trip_id: p.trip_id,
            name: p.payload?.name ?? null,
            address: p.payload?.address ?? null,
            check_in: p.payload?.check_in ?? null,
            check_out: p.payload?.check_out ?? null,
            notes: p.payload?.notes ?? null,
          }).select('id, trip_id, name').single()
        if (e) throw e
        created = { table: 'accommodations', record: data }
        break
      }
      case 'transport': {
        const { data, error: e } = await sb.from('transports')
          .insert({
            trip_id: p.trip_id,
            mode: p.payload?.mode ?? null,
            from_city: p.payload?.from_city ?? null,
            to_city: p.payload?.to_city ?? null,
            depart_at: p.payload?.depart_at ?? null,
            arrive_at: p.payload?.arrive_at ?? null,
            carrier: p.payload?.carrier ?? null,
            code: p.payload?.code ?? null,
            notes: p.payload?.notes ?? null,
          }).select('id, trip_id, mode').single()
        if (e) throw e
        created = { table: 'transports', record: data }
        break
      }
      case 'itinerary_event': {
        const { data, error: e } = await sb.from('itinerary_events')
          .insert({
            trip_id: p.trip_id,
            title: p.payload?.title ?? p.summary ?? 'Event',
            date: p.payload?.date ?? null,
            start_time: p.payload?.start_time ?? null,
            end_time: p.payload?.end_time ?? null,
            location: p.payload?.location ?? null,
            notes: p.payload?.notes ?? null,
          }).select('id, trip_id, title').single()
        if (e) throw e
        created = { table: 'itinerary_events', record: data }
        break
      }
      default: { // note/other
        const { data, error: e } = await sb.from('notes')
          .insert({
            trip_id: p.trip_id,
            content: p.payload?.content ?? p.summary ?? '',
          }).select('id, trip_id').single()
        if (e) throw e
        created = { table: 'notes', record: data }
      }
    }

    await sb.from('ai_proposals').update({ status: 'applied' }).eq('id', p.id)
    return NextResponse.json({ ok: true, created })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Apply failed' }, { status: 500 })
  }
}
