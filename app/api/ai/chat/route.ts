import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

type Proposal = {
  id: string
  trip_id: string | null
  kind: 'flight' | 'accommodation' | 'transport' | 'itinerary_event' | 'note' | 'other'
  summary?: string | null
  payload?: any
  status?: 'new' | 'applied' | 'rejected'
}

function isoDate(d: Date | null) {
  return d && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null
}
function parsePrompt(prompt: string) {
  const p = prompt.toLowerCase().replace(/\s+/g, ' ').trim()
  const wantsTrip = /(make|create)\s+(a )?(new )?trip/.test(p)

  const destMatch = p.match(/\bto\s+([a-z\s]+?)(?:\s+(on|from|for|starting|ending)\b|$)/i)
  const destination = destMatch ? destMatch[1].trim().replace(/[^a-z\s]/gi, '').replace(/\s+/g, ' ') : null

  const dateMatch =
    p.match(/\b(?:on|from|starting)\s+([a-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?|\d{1,2}\s+[a-z]{3,9}(?:\s*\d{4})?)\b/i)
  let startDate: Date | null = null
  if (dateMatch) {
    const cleaned = dateMatch[1].replace(/(\d{1,2})(st|nd|rd|th)/, '$1')
    const d = new Date(cleaned)
    startDate = isNaN(d.getTime()) ? null : d
  }
  return { wantsTrip, destination, startDate }
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : undefined
  const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } as any }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const prompt = (form.get('prompt') as string) || ''
  const selectedTripId = (form.get('trip_id') as string) || null

  const proposals: Proposal[] = []
  let reply = ''

  const { wantsTrip, destination, startDate } = parsePrompt(prompt)

  if (!selectedTripId && wantsTrip && destination) {
    const title = `Trip to ${destination.replace(/\b\w/g, c => c.toUpperCase())}`
    const insert: any = { title, created_by: user.id }
    const sd = isoDate(startDate)
    if (sd) insert.start_date = sd

    const ins = await supabase.from('trips').insert(insert).select('id,title,start_date').single()
    if (ins.error) {
      return NextResponse.json({ error: `Failed to create trip: ${ins.error.message}` }, { status: 500 })
    }

    proposals.push({
      id: crypto.randomUUID(),
      trip_id: ins.data.id,
      kind: 'note',
      summary: `Add planning note for ${destination}`,
      payload: { trip_id: ins.data.id, content: `Planning for ${title}`, created_by: user.id },
      status: 'new',
    })

    reply = `Created trip "${ins.data.title}".`
    return NextResponse.json({ reply, proposals })
  }

  if (selectedTripId) {
    const wantsHotel = /(hotel|accommodation)/i.test(prompt)
    const wantsFlight = /\b(flight|fly|airline)\b/i.test(prompt)
    const wantsEvent  = /\b(itinerary|event|meeting|activity)\b/i.test(prompt)

    if (wantsHotel) {
      proposals.push({
        id: crypto.randomUUID(),
        trip_id: selectedTripId,
        kind: 'accommodation',
        summary: 'Add a hotel (placeholder)',
        payload: {
          trip_id: selectedTripId,
          name: 'TBD Hotel',
          check_in: isoDate(startDate),
          check_out: null,
          location: destination || null,
          created_by: user.id,
        },
        status: 'new',
      })
    }
    if (wantsFlight) {
      proposals.push({
        id: crypto.randomUUID(),
        trip_id: selectedTripId,
        kind: 'transport',
        summary: 'Add an outbound flight (placeholder)',
        payload: {
          trip_id: selectedTripId,
          mode: 'flight',
          from: null,
          to: destination || null,
          depart_time: startDate ? startDate.toISOString() : null,
          created_by: user.id,
        },
        status: 'new',
      })
    }
    if (wantsEvent) {
      proposals.push({
        id: crypto.randomUUID(),
        trip_id: selectedTripId,
        kind: 'itinerary_event',
        summary: 'Add itinerary event (placeholder)',
        payload: {
          trip_id: selectedTripId,
          title: 'Planned activity',
          start_time: startDate ? startDate.toISOString() : null,
          end_time: null,
          location: destination || null,
          notes: null,
          created_by: user.id,
        },
        status: 'new',
      })
    }

    if (proposals.length) {
      return NextResponse.json({ reply: 'Drafted proposals. Review and Apply.', proposals })
    }
  }

  reply =
    'I can create trips and add items. Try: “Create a new trip to Paris on Oct 12.” Or select a trip and say “Add a hotel Apr 12–14 and a flight.”'
  return NextResponse.json({ reply, proposals: [] })
}
