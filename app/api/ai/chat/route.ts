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
  const sb = sbFrom(req)
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fd = await req.formData()
  const prompt = String(fd.get('prompt') || '')
  const trip_id = String(fd.get('trip_id') || '').trim() || null

  if (!prompt && !fd.getAll('files').length) {
    return NextResponse.json({ error: 'Please enter a prompt or attach files.' }, { status: 400 })
  }

  let reply = ''
  let proposals: IncomingProposal[] = []

  try {
    const sys = `
You are Trip AI for a travel-planning app. Return STRICT JSON:
{
  "reply": "short confirmation",
  "proposals": [
    { "kind": "trip|accommodation|transport|itinerary_event|note|other",
      "summary": "1-line",
      "payload": {...} }
  ]
}
Trip payload: { "title": string, "start_date"?: "YYYY-MM-DD", "end_date"?: "YYYY-MM-DD", "notes"?: string }
Accommodation payload: { "name"?: string, "address"?: string, "check_in"?: "YYYY-MM-DD", "check_out"?: "YYYY-MM-DD", "notes"?: string }
Transport payload: { "mode"?: "flight|train|car|bus|taxi|other", "from_city"?: string, "to_city"?: string, "depart_at"?: "YYYY-MM-DDTHH:mm", "arrive_at"?: "YYYY-MM-DDTHH:mm", "carrier"?: string, "code"?: string, "notes"?: string }
Itinerary_event payload: { "title": string, "date"?: "YYYY-MM-DD", "start_time"?: "HH:mm", "end_time"?: "HH:mm", "location"?: string, "notes"?: string }
Note payload: { "content": string }
Never say you already created anything.
`.trim()

    const body = {
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' as const },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: prompt || '(User uploaded docs.)' },
      ],
    }

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
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
  } catch {
    reply = 'Drafted a trip proposal from your request.'
    proposals = [{ kind: 'trip', summary: 'New Trip', payload: { title: 'New Trip' } }]
  }

  const inserted: any[] = []
  for (const p of proposals) {
    const { data } = await sb
      .from('ai_proposals')
      .insert({ trip_id, kind: p.kind, summary: p.summary ?? null, payload: p.payload ?? {}, status: 'new' })
      .select('id, trip_id, kind, summary, payload, status')
      .single()
    if (data) inserted.push(data)
  }

  return NextResponse.json({ reply, proposals: inserted })
}
