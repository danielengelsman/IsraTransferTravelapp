// app/api/ai/chat/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

type IncomingProposal = {
  kind: 'trip' | 'accommodation' | 'transport' | 'itinerary_event' | 'note' | 'other'
  summary?: string | null
  payload?: any
}

function sbFrom(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : undefined
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: jwt ? { Authorization: `Bearer ${jwt}` } : {} },
  })
}

export async function POST(req: Request) {
  // --- Auth (required so we can write proposals) ---
  const sb = sbFrom(req)
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fd = await req.formData()
  const prompt = String(fd.get('prompt') || '')
  const trip_id_raw = String(fd.get('trip_id') || '').trim()
  const trip_id = trip_id_raw || null

  // If no prompt/files, short-circuit
  if (!prompt && !fd.getAll('files').length) {
    return NextResponse.json({ error: 'Please enter a prompt or attach files.' }, { status: 400 })
  }

  // --- Call OpenAI for structured proposals ---
  let reply = ''
  let proposals: IncomingProposal[] = []

  try {
    const sys = `
You are Trip AI for a travel-planning app. Convert the user's request into concrete "proposals".
Return STRICT JSON with this shape:
{
  "reply": "short confirmation for the user",
  "proposals": [
    {
      "kind": "trip" | "accommodation" | "transport" | "itinerary_event" | "note" | "other",
      "summary": "1-line human summary",
      "payload": { ...fields needed to create the record... }
    }
  ]
}

Field guidance:
- trip.payload: { "title": string, "start_date"?: "YYYY-MM-DD", "end_date"?: "YYYY-MM-DD", "notes"?: string }
- accommodation.payload: { "name"?: string, "address"?: string, "check_in"?: "YYYY-MM-DD", "check_out"?: "YYYY-MM-DD", "notes"?: string }
- transport.payload: { "mode"?: "flight|train|car|bus|taxi|other", "from_city"?: string, "to_city"?: string, "depart_at"?: "YYYY-MM-DDTHH:mm", "arrive_at"?: "YYYY-MM-DDTHH:mm", "carrier"?: string, "code"?: string, "notes"?: string }
- itinerary_event.payload: { "title": string, "date"?: "YYYY-MM-DD", "start_time"?: "HH:mm", "end_time"?: "HH:mm", "location"?: string, "notes"?: string }
- note.payload: { "content": string }

Prefer concise, reasonable defaults when info is missing. NEVER claim you already created anything.
    `.trim()

    const body = {
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' as const },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: prompt || '(User uploaded files; extract bookings and plans.)' },
      ],
    }

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!aiRes.ok) {
      const txt = await aiRes.text()
      return NextResponse.json({ error: `OpenAI error: ${txt}` }, { status: 500 })
    }

    const ai = await aiRes.json()
    const raw = ai?.choices?.[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)
    reply = String(parsed.reply || '').slice(0, 4000)
    proposals = Array.isArray(parsed.proposals) ? parsed.proposals : []
  } catch (e: any) {
    // Very safe fallback: make at least one "trip" proposal from plain text
    reply = 'Drafted proposals from your request.'
    const m = prompt.match(/(new|create).*(trip).*?(to|for)\s+([a-z ]+)/i)
    const title = m?.[4]?.trim()
    proposals = [
      { kind: 'trip', summary: `Trip${title ? ` to ${title}` : ''}`, payload: { title: title ? `Trip to ${title}` : 'New Trip' } },
    ]
  }

  // --- Insert proposals into DB and return them with ids ---
  const inserted: any[] = []
  for (const p of proposals) {
    const { data, error } = await sb
      .from('ai_proposals')
      .insert({
        trip_id,
        kind: p.kind,
        summary: p.summary ?? null,
        payload: p.payload ?? {},
        status: 'new',
      })
      .select('id, trip_id, kind, summary, payload, status')
      .single()

    if (error) {
      // If one insert fails, skip it but continue with others
      // (you’ll still see the rest in the UI)
      continue
    }
    inserted.push(data)
  }

  return NextResponse.json({ reply, proposals: inserted })
}
