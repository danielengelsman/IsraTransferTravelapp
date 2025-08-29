/* app/api/ai/chat/route.ts */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createBearerSupabase } from '@/lib/supabase/server'

type ProposalKind = 'flight' | 'accommodation'
type Proposal = {
  id: string
  trip_id: string | null
  kind: ProposalKind
  summary?: string | null
  payload: any
  status?: 'new' | 'applied' | 'rejected'
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

export const runtime = 'nodejs' // we need Node (pdf/eml parsing)

export async function POST(req: NextRequest) {
  // --- Auth (cookie or Bearer) ---
  let sb = createServerSupabase()
  let { data: { user } } = await sb.auth.getUser()

  if (!user) {
    const authz = req.headers.get('authorization') || ''
    const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7) : ''
    if (token) {
      sb = createBearerSupabase(token)
      const check = await sb.auth.getUser()
      user = check.data.user ?? null
    }
  }
  // Allow unauthenticated *compose*, but your UI already gates access.
  // If you want hard-block: uncomment
  // if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // --- Read form (prompt + files + optional trip) ---
  const form = await req.formData()
  const prompt = String(form.get('prompt') ?? '').trim()
  const tripId = (form.get('trip_id') ? String(form.get('trip_id')) : '') || null
  const files = form.getAll('files').filter(Boolean) as File[]

  if (!prompt && files.length === 0) {
    return NextResponse.json({ error: 'Please provide a prompt or files.' }, { status: 400 })
  }

  // --- Extract text from supported files; collect image data URLs for OCR via vision ---
  const textParts: string[] = []
  const imageUrls: string[] = [] // data:image/...;base64,...

  for (const f of files) {
    const name = (f.name || 'file').toLowerCase()
    const type = f.type || ''
    const buf = Buffer.from(await f.arrayBuffer())

    try {
      if (name.endsWith('.pdf')) {
        const pdfParse = (await import('pdf-parse')).default
        const data = await pdfParse(buf)
        const snippet = (data.text || '').slice(0, 30000)
        if (snippet) textParts.push(`[[PDF:${f.name}]]\n${snippet}`)
      } else if (name.endsWith('.eml')) {
        const { simpleParser } = await import('mailparser')
        const mail = await simpleParser(buf)
        const body = (mail.text || mail.htmlAsText || '').slice(0, 30000)
        textParts.push(`[[EMAIL:${f.name} Subject:${mail.subject ?? ''}]]\n${body}`)
      } else if (name.endsWith('.txt')) {
        const s = buf.toString('utf8').slice(0, 30000)
        textParts.push(`[[TEXT:${f.name}]]\n${s}`)
      } else if (type.startsWith('image/')) {
        const b64 = buf.toString('base64')
        imageUrls.push(`data:${type};base64,${b64}`)
      } else {
        // fallback: try utf8
        const s = buf.toString('utf8')
        if (s) textParts.push(`[[FILE:${f.name}]]\n${s.slice(0, 30000)}`)
      }
    } catch (e: any) {
      textParts.push(`[[ERROR reading ${f.name}]] ${e?.message || e}`)
    }
  }

  // --- Build the model prompt ---
  const instruction = `
You are "Trip AI" for a travel management app. Read the user's prompt and the uploaded documents.
Output ONLY valid JSON with this shape:

{
  "assistant_reply": string,      // 1-2 helpful lines max, no chit-chat
  "proposals": [
    {
      "id": string,               // server will replace if missing
      "trip_id": string | null,   // pass through requested trip_id if present; else null
      "kind": "flight" | "accommodation",
      "summary": string,          // short human summary
      "payload": object           // see required keys per kind below
    }
  ]
}

For kind "flight", keep keys (optional if unknown):
{
  "airline": string,
  "flight_no": string,
  "from_airport": string,         // IATA code if possible
  "to_airport": string,
  "depart_at": string,            // ISO 8601
  "arrive_at": string,            // ISO 8601
  "booking_ref": string,
  "price": number,
  "currency": string
}

For kind "accommodation":
{
  "hotel_name": string,
  "address": string,
  "check_in": string,             // ISO date or datetime
  "check_out": string,            // ISO date or datetime
  "confirmation": string,
  "price": number,
  "currency": string
}

- Use the docs to decide whether something is a flight or accommodation.
- If nothing actionable, return an empty "proposals" array but still explain briefly in "assistant_reply".
- Dates MUST be ISO (e.g. 2025-10-12 or 2025-10-12T14:30:00Z).
- Be conservative; do not hallucinate missing fields.

Return strict JSON. No markdown, no commentary.
`.trim()

  // --- Call OpenAI (text + vision images) ---
  const userText = [
    prompt ? `User prompt:\n${prompt}` : '',
    textParts.length ? `\nDocument text:\n${textParts.join('\n\n---\n\n')}` : ''
  ].join('\n\n').trim()

  const content: any[] = [{ type: 'text', text: userText || '(no text provided)' }]
  for (const url of imageUrls.slice(0, 4)) {
    content.push({ type: 'image_url', image_url: { url } })
  }

  const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: instruction },
        { role: 'user', content },
      ],
    }),
  })

  if (!oaiRes.ok) {
    const errText = await oaiRes.text()
    return NextResponse.json({ error: `OpenAI error: ${errText}` }, { status: 500 })
  }

  const data = await oaiRes.json()
  const raw = data?.choices?.[0]?.message?.content ?? '{}'

  let parsed: any
  try { parsed = JSON.parse(raw) } catch {
    // try to salvage JSON substring
    const m = raw.match(/\{[\s\S]*\}$/)
    parsed = m ? JSON.parse(m[0]) : { assistant_reply: raw, proposals: [] }
  }

  const proposals: Proposal[] = Array.isArray(parsed?.proposals) ? parsed.proposals : []
  const safe = proposals.map((p: any) => ({
    id: p?.id || crypto.randomUUID(),
    trip_id: p?.trip_id ?? tripId ?? null,
    kind: (p?.kind === 'accommodation' ? 'accommodation' : 'flight') as ProposalKind,
    summary: p?.summary ?? null,
    payload: p?.payload ?? {},
    status: 'new' as const,
  }))

  return NextResponse.json({
    reply: String(parsed?.assistant_reply ?? ''),
    proposals: safe,
  })
}
