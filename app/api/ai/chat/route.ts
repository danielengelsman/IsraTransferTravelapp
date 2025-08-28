import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const OPENAI_KEY = process.env.OPENAI_API_KEY!

function sbFromBearer(token?: string) {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  })
}

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    // Accept Authorization: Bearer <jwt> from client
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
    const sb = sbFromBearer(token)

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await req.formData()
    const prompt = (form.get('prompt') as string) || ''
    const tripId = (form.get('trip_id') as string) || null
    // (files are available if you later want to parse them)
    // const files = form.getAll('files') as File[]

    // Ask the model for STRICT JSON proposals
    const system = `You are Trip AI inside our travel app.
Return ONLY JSON (no markdown) shaped like:
{
  "reply": string,
  "proposals": [
    { "kind": "trip"|"flight"|"accommodation"|"transport"|"itinerary_event"|"note",
      "summary": string,
      "payload": { ... domain fields ... }
    }
  ]
}
Rules:
- Use ISO dates (YYYY-MM-DD).
- If user did NOT select a trip, include a 'trip' proposal (title, start_date, end_date, notes).
- Keep "summary" short and human-friendly.
- 1–3 proposals max per request.
- No extra keys. JSON only.`

    const body = {
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' as const },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt || 'Create structured proposals for this trip.' },
      ],
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) {
      const txt = await r.text()
      return NextResponse.json({ error: `OpenAI error: ${txt}` }, { status: 500 })
    }

    const j = await r.json()
    let modelOut: any
    try {
      modelOut = JSON.parse(j?.choices?.[0]?.message?.content ?? '{}')
    } catch {
      modelOut = { reply: j?.choices?.[0]?.message?.content ?? '', proposals: [] }
    }

    const reply: string = modelOut.reply ?? ''
    const generated: any[] = Array.isArray(modelOut.proposals) ? modelOut.proposals : []

    // Save proposals so Apply/Reject can act on them
    const rows = generated.map((p) => ({
      trip_id: tripId,
      kind: p.kind,
      summary: p.summary,
      payload: p.payload,
      status: 'new',
    }))

    let inserted: any[] = []
    if (rows.length) {
      const { data, error } = await sb.from('ai_proposals').insert(rows).select('*')
      if (!error) inserted = data || []
    }

    return NextResponse.json({ reply, proposals: inserted })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
