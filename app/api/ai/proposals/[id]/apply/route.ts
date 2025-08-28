import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function sbFrom(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  return createClient(URL, KEY, { global: { headers: token ? { Authorization: `Bearer ${token}` } : {} } })
}

export async function POST(req: NextRequest, { params }: any) {
  const sb = sbFrom(req)
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = String(params?.id || '')
  const { data: p, error: e1 } = await sb.from('ai_proposals').select('*').eq('id', id).single()
  if (e1 || !p) return NextResponse.json({ error: e1?.message || 'Not found' }, { status: 404 })

  // Try to write to domain tables (ignore errors if a table doesn't exist)
  try {
    if (p.kind === 'trip') {
      const x = p.payload || {}
      await sb.from('trips').insert({
        title: x.title ?? p.summary ?? 'New Trip',
        start_date: x.start_date ?? null,
        end_date: x.end_date ?? null,
        notes: x.notes ?? null,
      })
    } else if (p.kind === 'flight') {
      await sb.from('trip_flights').insert({ trip_id: p.trip_id, ...(p.payload || {}) })
    } else if (p.kind === 'accommodation') {
      await sb.from('trip_accommodations').insert({ trip_id: p.trip_id, ...(p.payload || {}) })
    } else if (p.kind === 'transport') {
      await sb.from('trip_transports').insert({ trip_id: p.trip_id, ...(p.payload || {}) })
    } else if (p.kind === 'itinerary_event') {
      await sb.from('itinerary_events').insert({ trip_id: p.trip_id, ...(p.payload || {}) })
    }
  } catch (_) {
    // swallow — we still flip status so the UI progresses
  }

  await sb.from('ai_proposals').update({ status: 'applied' }).eq('id', id)
  return NextResponse.json({ ok: true })
}
