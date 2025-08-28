// app/api/ai/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const OPENAI_KEY = process.env.OPENAI_API_KEY!

function sbFromBearer(token?: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  })
}

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    // auth (bearer from client)
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
    const sb = sbFromBearer(token)

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await req.formData()
    const prompt = (form.get('prompt') as string) || ''
    const tripId = (form.get('trip_id') as string) || null

    const system = `You are Trip AI inside our travel app.
Return ONLY JSON (no markdown) like:
{
  "reply": string,
  "proposals": [
    {
      "kind": "trip" | "flight" | "accommodation" | "transport" | "itinerary_event" | "note",
      "summary": string,
      "payload": { /* fields for that kind */ }
    }
  ]
}
Rules:
- ISO dates YYYY-MM-DD, 24h times HH:MM if needed.
- If trip_id is not provided, include a "trip" proposal (title, start_date, end_date, notes).
- Keep proposals concrete and actionable for our DB. 1–3 items max.`

    const body = {
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' as const },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt || 'Create structured proposals for this request.' },
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
    let parsed: any = {}
    try { parsed = JSON.parse(j?.choices?.[0]?.message?.content ?? '{}') } catch {}

    const reply: string = parsed?.reply ?? ''
    const raw = Array.isArray(parsed?.proposals) ? parsed.proposals : []

    // insert proposals with user_id for RLS
    let inserted: any[] = []
    let insertError: string | null = null
    if (raw.length) {
      const rows = raw.map((p: any) => ({
        user_id: user.id,
        trip_id: tripId,
        kind: p.kind,
        summary: p.summary,
        payload: p.payload,
        status: 'new',
      }))
      const { data, error } = await sb.from('ai_proposals').insert(rows).select('*')
      if (error) insertError = error.message
      inserted = data || []
    }

    return NextResponse.json({
      reply,
      proposals: inserted,     // what the UI shows
      proposals_raw: raw,      // for debugging if needed
      insert_error: insertError
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
