// app/api/ai/make-trip/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

type TripInput = {
  title: string
  dest_city?: string | null
  dest_country?: string | null
  start_date?: string | null
  end_date?: string | null
}

function normalizeTripInput(raw: any): TripInput {
  // Accept either { title, ... } or { trip: { title, ... } }
  const src = raw?.trip && typeof raw.trip === 'object' ? raw.trip : raw
  const clean = (v: any) => (v === undefined || v === '' ? null : String(v))
  return {
    title: String(src?.title ?? 'New Trip'),
    dest_city: clean(src?.dest_city),
    dest_country: clean(src?.dest_country),
    start_date: clean(src?.start_date),
    end_date: clean(src?.end_date),
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb = createServerSupabase()

    // Auth
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Body
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }
    const tripInput = normalizeTripInput(body)

    // Insert payload
    const base = {
      title: tripInput.title,
      dest_city: tripInput.dest_city,
      dest_country: tripInput.dest_country,
      start_date: tripInput.start_date,
      end_date: tripInput.end_date,
    }

    // Try insert with created_by; if the column doesn't exist, retry without it.
    let result = await sb
      .from('trips')
      .insert({ ...base, created_by: user.id })
      .select('id')
      .single()

    if (result.error && /created_by/.test(result.error.message)) {
      result = await sb.from('trips').insert(base).select('id').single()
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, trip_id: result.data.id })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    )
  }
}
