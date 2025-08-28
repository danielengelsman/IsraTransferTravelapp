import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

// Helper: very small JSON “schema” to guide the model
const SYSTEM = `
You extract trip facts and return ONLY JSON with an array "proposals".
Each proposal has: { "kind": "flight|accommodation|transport|event", "payload": {...}}.
If data is missing, omit the field. NEVER invent prices or times.
Examples:

User: "Add BA flight TLV to LHR, Oct 12 dep 09:10, arrive 12:15, BA162"
Return:
{
  "proposals":[{"kind":"flight","payload":{
    "carrier":"British Airways","flight_number":"BA162",
    "depart_airport":"TLV","arrive_airport":"LHR",
    "depart_time":"2025-10-12T09:10:00Z","arrive_time":"2025-10-12T12:15:00Z",
    "flight_type":"international"
  }}]
}
`

export async function POST(req: Request) {
  try {
    const { tripId, message } = await req.json()
    if (!tripId || !message) return NextResponse.json({ error: 'tripId and message required' }, { status: 400 })

    const sb = createServerSupabase()
    // Call OpenAI – if no key, fall back to a dumb parser
    let extracted: any = null

    if (process.env.OPENAI_API_KEY) {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: message }
          ],
          response_format: { type: 'json_object' }
        })
      })
      const json = await resp.json()
      const content = json?.choices?.[0]?.message?.content
      try { extracted = JSON.parse(content) } catch { /* ignore */ }
    }

    // Fallback: naive “no-AI” extractor (very simple)
    if (!extracted) {
      const lower = String(message).toLowerCase()
      if (lower.includes('flight')) {
        extracted = { proposals: [{ kind: 'flight', payload: { notes: message } }] }
      } else if (lower.includes('hotel') || lower.includes('accommodation')) {
        extracted = { proposals: [{ kind: 'accommodation', payload: { notes: message } }] }
      } else if (lower.includes('train') || lower.includes('taxi') || lower.includes('car')) {
        extracted = { proposals: [{ kind: 'transport', payload: { notes: message } }] }
      } else {
        extracted = { proposals: [{ kind: 'event', payload: { title: message, date: null } }] }
      }
    }

    const proposals = Array.isArray(extracted?.proposals) ? extracted.proposals : []
    const rows = proposals.map((p:any) => ({
      trip_id: tripId,
      kind: p.kind,
      payload: p.payload,
    }))

    if (rows.length > 0) {
      const { error } = await sb.from('ai_proposals').insert(rows)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      created: rows.length,
      reply: rows.length
        ? `I created ${rows.length} suggestion${rows.length>1?'s':''}. Review them in AI Suggestions.`
        : `I couldn't extract anything actionable.`
    })
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
