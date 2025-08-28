import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

// IMPORTANT: the second arg type MUST be an inline literal, not an alias.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const id = params.id

  // Require a Supabase session token from the client (Trip AI page sends it)
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Make a user-context Supabase client (uses that token for RLS)
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  // Load proposal
  const { data: p, error: e1 } = await sb.from('ai_proposals').select('*').eq('id', id).single()
  if (e1 || !p) {
    return NextResponse.json({ error: e1?.message || 'Not found' }, { status: 404 })
  }

  let err: string | null = null

  try {
    // Apply minimal mappings safely; ignore unknown fields
    if (p.kind === 'flight') {
      const x = p.payload || {}
      const row = {
        trip_id: p.trip_id,
        flight_type: x.flight_type ?? x.type ?? null,
        carrier: x.carrier ?? null,
        flight_number: x.flight_number ?? x.number ?? null,
        depart_airport: x.depart_airport ?? x.from_airport ?? null,
        arrive_airport: x.arrive_airport ?? x.to_airport ?? null,
        depart_time: x.depart_time ?? x.depart_at ?? null,
        arrive_time: x.arrive_time ?? x.arrive_at ?? null,
        notes: x.notes ?? null,
      }
      const { error } = await sb.from('flights').insert(row)
      if (error) throw error
    } else if (p.kind === 'accommodation') {
      const x = p.payload || {}
      const row = {
        trip_id: p.trip_id,
        name: x.name ?? null,
        address: x.address ?? null,
        check_in: x.check_in ?? x.start_date ?? null,
        check_out: x.check_out ?? x.end_date ?? null,
        booking_ref: x.booking_ref ?? null,
        notes: x.notes ?? null,
        cost: x.cost ?? null,
        currency: x.currency ?? null,
      }
      const { error } = await sb.from('accommodations').insert(row)
      if (error) throw error
    } else if (p.kind === 'transport') {
      const x = p.payload || {}
      const row = {
        trip_id: p.trip_id,
        type: x.type ?? null,
        company: x.company ?? null,
        pickup_location: x.pickup_location ?? x.from ?? null,
        dropoff_location: x.dropoff_location ?? x.to ?? null,
        start_time: x.start_time ?? x.start ?? null,
        end_time: x.end_time ?? x.end ?? null,
        cost: x.cost ?? null,
        currency: x.currency ?? null,
        notes: x.notes ?? null,
      }
      const { error } = await sb.from('transports').insert(row)
      if (error) throw error
    } else if (p.kind === 'itinerary_event') {
      // Merge into trips.itinerary JSON array
      const { data: trip } = await sb.from('trips')
        .select('itinerary')
        .eq('id', p.trip_id)
        .single()
      const next = Array.isArray(trip?.itinerary) ? [...trip!.itinerary] : []
      next.push({ id: String(Date.now()), ...(p.payload || {}) })
      const { error } = await sb.from('trips').update({ itinerary: next }).eq('id', p.trip_id)
      if (error) throw error
    } // 'note' / 'other' -> just mark applied
  } catch (e: any) {
    err = e?.message || 'Failed to apply proposal'
  }

  if (err) {
    return NextResponse.json({ error: err }, { status: 400 })
  }

  await sb.from('ai_proposals').update({ status: 'applied' }).eq('id', id)
  return NextResponse.json({ ok: true })
}
