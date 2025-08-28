// app/api/ai/chat/route.ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

type TripAction =
  | { kind: 'trip_update'; payload: { title?: string|null; location?: string|null; start_date?: string|null; end_date?: string|null; notes?: string|null } }
  | { kind: 'flight'; payload: { flight_type?: 'international'|'internal'|null; carrier?: string|null; flight_number?: string|null; depart_airport?: string|null; arrive_airport?: string|null; depart_time?: string|null; arrive_time?: string|null; notes?: string|null } }
  | { kind: 'accommodation'; payload: { name?: string|null; address?: string|null; check_in?: string|null; check_out?: string|null; booking_ref?: string|null; cost?: number|null; currency?: string|null; notes?: string|null } }
  | { kind: 'transport'; payload: { type?: 'car_hire'|'toll'|'train'|'taxi'|'other'|null; company?: string|null; pickup_location?: string|null; dropoff_location?: string|null; start_time?: string|null; end_time?: string|null; cost?: number|null; currency?: string|null; notes?: string|null } }
  | { kind: 'event'; payload: { title: string; type: 'Meeting'|'Call'|'Booth'|'Flight'|'Other'; date: string; start_time?: string|null; end_time?: string|null; venue?: string|null; location?: string|null; notes?: string|null } }

export async function POST(req: Request) {
  try {
    const sb = await createServerSupabase()

    // Auth: cookie session or Bearer token from client
    let userId: string | null = null
    const { data: cookieAuth } = await sb.auth.getUser()
    userId = cookieAuth?.user?.id ?? null

    if (!userId) {
      const hdr = req.headers.get('authorization') || ''
      if (hdr.toLowerCase().startsWith('bearer ')) {
        const token = hdr.slice(7)
        const { data } = await sb.auth.getUser(token)
        userId = data?.user?.id ?? null
      }
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Read input (prompt + optional trip_id + optional files)
    const ct = req.headers.get('content-type') || ''
    let prompt = ''
    let trip_id: string | null = null
    let imageParts: { type: 'image_url'; image_url: { url: string } }[] = []

    if (ct.includes('multipart/form-data')) {
      const form = await req.formData()
      prompt = String(form.get('prompt') || '').trim()
      trip_id = (form.get('trip_id') ? String(form.get('trip_id')) : '').trim() || null

      // pass images to the model (PNG/JPG only)
      const files = form.getAll('files').filter((v): v is File => v instanceof File)
      for (const f of files) {
        if (f.type.startsWith('image/')) {
          const ab = await f.arrayBuffer()
          const b64 = Buffer.from(ab).toString('base64')
          const mime = f.type || 'image/png'
          imageParts.push({
            type: 'image_url',
            image_url: { url: `data:${mime};base64,${b64}` },
          })
        }
      }
    } else {
      const body = await req.json().catch(() => ({}))
      prompt = String(body.prompt || '').trim()
      trip_id = (body.trip_id ? String(body.trip_id) : '').trim() || null
    }

    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })

    const key = process.env.OPENAI_API_KEY
    if (!key) {
      return NextResponse.json({ error: 'AI is not configured. Set OPENAI_API_KEY.' }, { status: 500 })
    }

    // Domain system prompt – forces structured actions that map to your DB
    const systemPrompt = `
You are the Trip Builder for a travel operations app. Convert the user request + receipts into precise actions for this schema:

- trips: { title, location, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD) }
- flights: { flight_type: international|internal, carrier, flight_number, depart_airport, arrive_airport, depart_time (ISO), arrive_time (ISO), notes }
- accommodations: { name, address, check_in (YYYY-MM-DD), check_out (YYYY-MM-DD), booking_ref, cost (number), currency (3-letter), notes }
- transports: { type: car_hire|toll|train|taxi|other, company, pickup_location, dropoff_location, start_time (ISO), end_time (ISO), cost (number), currency (3-letter), notes }
- events (trip itinerary JSON): { title, type: Meeting|Call|Booth|Flight|Other, date (YYYY-MM-DD), start_time (HH:MM), end_time (HH:MM), venue, location, notes }

IMPORTANT:
- Output STRICT JSON with keys: { "summary": string, "actions": TripAction[] } and NOTHING else.
- Only include fields you are confident about; set unknowns to null or omit.
- Normalize dates/times to the required formats above.
- Pull amounts/currencies from receipts if present.
- Be concise; do not chat in the summary.
    `.trim()

    // Build multi-part "user" content (text + optional images)
    const userContent: any[] = [{ type: 'text', text: prompt }]
    if (imageParts.length) userContent.push(...imageParts)

    // Call OpenAI
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      }),
    })

    if (!r.ok) {
      const txt = await r.text()
      try {
        const je = JSON.parse(txt)
        if (je?.error?.code === 'insufficient_quota') {
          return NextResponse.json(
            { error: 'AI credits are exhausted. Please add billing to OpenAI or use a different key.' },
            { status: 402 },
          )
        }
      } catch {}
      return NextResponse.json({ error: `OpenAI error: ${txt}` }, { status: r.status })
    }

    const j = await r.json()
    const raw = j?.choices?.[0]?.message?.content || '{}'
    let parsed: { summary?: string; actions?: TripAction[] } = {}
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = {}
    }

    const summary = String(parsed.summary || '')
    const actions = Array.isArray(parsed.actions) ? (parsed.actions as TripAction[]) : []

    // Convert actions to UI-ready "proposals" (what your /ai page expects)
    // We DON’T auto-write to DB here; user presses "Apply" per proposal.
    const proposals = actions.map((a, idx) => {
      const id = `${Date.now()}_${idx}`
      const kind = a.kind
      const payload = { ...(a as any).payload, ...(trip_id ? { trip_id } : {}) }

      // short summary for the card
      let s = ''
      if (kind === 'flight') {
        const c = payload.carrier || ''
        const no = payload.flight_number || ''
        const da = payload.depart_airport || ''
        const aa = payload.arrive_airport || ''
        s = [c, no].filter(Boolean).join(' ') + (da || aa ? ` — ${da} → ${aa}` : '')
      } else if (kind === 'accommodation') {
        s = `${payload.name || 'Accommodation'}${payload.address ? ` — ${payload.address}` : ''}`
      } else if (kind === 'transport') {
        s = `${payload.type || 'transport'}${payload.company ? ` — ${payload.company}` : ''}`
      } else if (kind === 'trip_update') {
        const parts = [payload.title, payload.location, payload.start_date && payload.end_date ? `${payload.start_date} → ${payload.end_date}` : ''].filter(Boolean)
        s = parts.join(' • ') || 'Update trip fields'
      } else if (kind === 'event') {
        s = `${payload.title} (${payload.type})${payload.date ? ` — ${payload.date}` : ''}`
      } else {
        s = 'Proposed change'
      }

      return { id, kind, summary: s, payload }
    })

    return NextResponse.json({
      reply: summary,     // one paragraph summary
      proposals,          // array displayed in the UI with Apply/Reject buttons
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
