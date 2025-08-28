// app/api/ai/proposals/[id]/apply/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const id = ctx.params.id

  // 1) Read the user token sent by the browser
  const auth = req.headers.get('authorization') || ''
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2) Make a supabase client that acts *as this user*
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  // 3) Load the proposal (must exist and be visible to the user via RLS)
  const { data: p, error: e1 } = await sb
    .from('ai_proposals')
    .select('*')
    .eq('id', id)
    .single()

  if (e1 || !p) return NextResponse.json({ error: e1?.message || 'Not found' }, { status: 404 })

  // 4) Apply it into your tables based on the kind
  let err: string | null = null
  try {
    if (p.kind === 'flight') {
      const { error } = await sb.from('flights').insert({ ...(p.payload || {}), trip_id: p.trip_id })
      if (error) err = error.message
    } else if (p.kind === 'accommodation') {
      const { error } = await sb.from('accommodations').insert({ ...(p.payload || {}), trip_id: p.trip_id })
      if (error) err = error.message
    } else if (p.kind === 'transport') {
      const { error } = await sb.from('transports').insert({ ...(p.payload || {}), trip_id: p.trip_id })
      if (error) err = error.message
    } else if (p.kind === 'itinerary_event') {
      // If you store itinerary on the trip as a JSON array:
      const { data: t, error: e2 } = await sb.from('trips').select('itinerary').eq('id', p.trip_id).single()
      if (e2) err = e2.message
      else {
        const next = Array.isArray(t?.itinerary) ? [...t.itinerary, p.payload] : [p.payload]
        const { error } = await sb.from('trips').update({ itinerary: next }).eq('id', p.trip_id)
        if (error) err = error.message
      }
    } else {
      err = 'Unknown proposal kind'
    }
  } catch (e: any) {
    err = e?.message || 'Apply failed'
  }

  if (err) return NextResponse.json({ error: err }, { status: 400 })

  // 5) Mark proposal as applied
  await sb.from('ai_proposals').update({ status: 'applied' }).eq('id', id)

  return NextResponse.json({ ok: true })
}
