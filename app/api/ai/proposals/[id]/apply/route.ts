import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

export async function POST(_: Request, context: { params: { id: string } }) {
  const id = context.params.id
  const sb = createServerSupabase()

  // Load proposal
  const { data: p, error: e1 } = await sb.from('ai_proposals').select('*').eq('id', id).single()
  if (e1 || !p) return NextResponse.json({ error: e1?.message || 'Not found' }, { status: 404 })

  let err: string | null = null

  // Apply based on kind
  if (p.kind === 'flight') {
    const pay = p.payload || {}
    const { error } = await sb.from('flights').insert({
      trip_id: p.trip_id,
      flight_type: pay.flight_type ?? null,
      carrier: pay.carrier ?? null,
      flight_number: pay.flight_number ?? null,
      depart_airport: pay.depart_airport ?? null,
      arrive_airport: pay.arrive_airport ?? null,
      depart_time: pay.depart_time ?? null,
      arrive_time: pay.arrive_time ?? null,
      notes: pay.notes ?? null,
    })
    err = error?.message || null
  } else if (p.kind === 'accommodation') {
    const pay = p.payload || {}
    const { error } = await sb.from('accommodations').insert({
      trip_id: p.trip_id,
      name: pay.name ?? null,
      address: pay.address ?? null,
      check_in: pay.check_in ?? null,
      check_out: pay.check_out ?? null,
      booking_ref: pay.booking_ref ?? null,
      notes: pay.notes ?? null,
      cost: pay.cost ?? null,
      currency: pay.currency ?? null,
    })
    err = error?.message || null
  } else if (p.kind === 'transport') {
    const pay = p.payload || {}
    const { error } = await sb.from('transports').insert({
      trip_id: p.trip_id,
      type: pay.type ?? 'other',
      company: pay.company ?? null,
      pickup_location: pay.pickup_location ?? null,
      dropoff_location: pay.dropoff_location ?? null,
      start_time: pay.start_time ?? null,
      end_time: pay.end_time ?? null,
      cost: pay.cost ?? null,
      currency: pay.currency ?? null,
      notes: pay.notes ?? null,
    })
    err = error?.message || null
  } else if (p.kind === 'event') {
    // Append to trip.itinerary (array of JSON)
    const { data: t, error: tErr } = await sb.from('trips').select('itinerary').eq('id', p.trip_id).single()
    if (tErr) err = tErr.message
    else {
      const arr = Array.isArray(t.itinerary) ? t.itinerary : []
      arr.push(p.payload || {})
      const { error } = await sb.from('trips').update({ itinerary: arr }).eq('id', p.trip_id)
      err = error?.message || null
    }
  } else {
    err = 'Unknown kind'
  }

  if (err) return NextResponse.json({ error: err }, { status: 400 })

  await sb.from('ai_proposals').update({ status: 'applied' }).eq('id', id)
  return NextResponse.json({ ok: true })
}
