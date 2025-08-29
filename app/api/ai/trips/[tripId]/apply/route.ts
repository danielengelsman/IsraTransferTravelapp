// app/api/ai/trips/[tripId]/apply/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server' // keep your existing helper
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Plan = {
  flights?: Array<{
    depart_city?: string
    depart_airport?: string
    arrive_city?: string
    arrive_airport?: string
    depart_at?: string // ISO
    arrive_at?: string // ISO
    airline?: string
    cost?: number
    currency?: 'GBP'|'USD'|'CAD'|'EUR'|'ILS'
  }>
  accommodations?: Array<{
    name?: string
    city?: string
    address?: string
    check_in?: string // date
    check_out?: string // date
    cost?: number
    currency?: 'GBP'|'USD'|'CAD'|'EUR'|'ILS'
  }>
  transports?: Array<{
    kind?: 'car_hire'|'taxi'|'toll'|'train'|'bus'|'ride_share'|'parking'|'fuel'|'other'
    vendor?: string
    date?: string // date
    from?: string
    to?: string
    cost?: number
    currency?: 'GBP'|'USD'|'CAD'|'EUR'|'ILS'
  }>
  itinerary_events?: Array<{
    title?: string
    start_at?: string // ISO
    end_at?: string // ISO
    location?: string
    notes?: string
  }>
}

export async function POST(req: NextRequest, { params }: { params: { tripId: string } }) {
  try {
    // ---- auth
    const sb = createServerSupabase()
    const { data: { user }, error: authErr } = await sb.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tripId = params.tripId

    // ---- read FormData (prompt + optional PDFs) — do ingest inline
    const form = await req.formData()
    const prompt =
      (form.get('prompt') as string | null) ??
      (form.get('description') as string | null) ??
      ''
    const files = form.getAll('files')

    let docsText = ''
    for (const f of files) {
      if (!(f instanceof File)) continue
      const name = f.name || 'document'
      if (!name.toLowerCase().endsWith('.pdf')) continue
      const buf = Buffer.from(await f.arrayBuffer())
      // dynamic import; types not required
      // @ts-expect-error
      const pdfParse = (await import('pdf-parse')).default as (b: Buffer) => Promise<{ text?: string }>
      const data = await pdfParse(buf)
      docsText += `\n\n# Document: ${name}\n${data?.text || ''}`
    }

    const combined = [prompt?.trim(), docsText.trim()].filter(Boolean).join('\n\n')
    if (!combined) {
      return NextResponse.json({ error: 'Provide a description or attach PDFs.' }, { status: 400 })
    }

    // ---- ask the model to produce a plan in JSON
    const system = `
You are a travel ops assistant. Given a description (and optionally parsed PDF text),
emit STRICT JSON for items to add to an existing trip.
Dates must be ISO (YYYY-MM-DD or YYYY-MM-DDTHH:mm).
Currencies must be one of: GBP, USD, CAD, EUR, ILS.
Schema:
{
 "flights":[{ "depart_city":"", "depart_airport":"", "arrive_city":"", "arrive_airport":"", "depart_at":"", "arrive_at":"", "airline":"", "cost":0, "currency":"USD" }],
 "accommodations":[{ "name":"", "city":"", "address":"", "check_in":"", "check_out":"", "cost":0, "currency":"USD" }],
 "transports":[{ "kind":"car_hire|taxi|toll|train|bus|ride_share|parking|fuel|other", "vendor":"", "date":"", "from":"", "to":"", "cost":0, "currency":"USD" }],
 "itinerary_events":[{ "title":"", "start_at":"", "end_at":"", "location":"", "notes":"" }]
}
Return ONLY JSON. If unsure, return an empty array for that section.
`
    const userMsg = `Trip ID: ${tripId}\nNow: ${new Date().toISOString()}\n\nINPUT:\n${combined}`

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg },
        ],
        response_format: { type: 'json_object' },
      }),
    })
    if (!r.ok) {
      const txt = await r.text()
      return NextResponse.json({ error: `OpenAI error: ${txt}` }, { status: 500 })
    }
    const j = await r.json() as any
    const content = j?.choices?.[0]?.message?.content ?? '{}'

    let plan: Plan = {}
    try {
      plan = JSON.parse(content)
    } catch {
      // try to salvage JSON if model wrapped in code fences
      const m = content.match(/{[\s\S]*}/)
      plan = m ? JSON.parse(m[0]) : {}
    }

    // ---- insert into Supabase
    const results = {
      flights: [] as any[],
      accommodations: [] as any[],
      transports: [] as any[],
      itinerary_events: [] as any[],
      errors: [] as string[],
    }

    async function safeInsert(table: string, rows: any[]) {
      if (!rows?.length) return
      const withMeta = rows.map(r => ({ ...r, trip_id: tripId, created_by: user.id }))
      const { data, error } = await sb.from(table).insert(withMeta).select()
      if (error) results.errors.push(`${table}: ${error.message}`)
      if (data) (results as any)[table] = data
    }

    await safeInsert('flights', plan.flights || [])
    await safeInsert('accommodations', plan.accommodations || [])
    await safeInsert('transports', plan.transports || [])
    await safeInsert('itinerary_events', plan.itinerary_events || [])

    return NextResponse.json({ applied: results, plan })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
