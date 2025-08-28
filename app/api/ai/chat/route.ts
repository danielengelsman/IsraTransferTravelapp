import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const sb = createServerSupabase()

  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { message, tripId } = await req.json().catch(() => ({} as any))
  if (!message) return NextResponse.json({ error: 'No message' }, { status: 400 })

  // Build short trip context if a trip is provided
  let context = ''
  if (tripId) {
    const { data: trip } = await sb.from('trips').select('*').eq('id', tripId).single()
    if (trip) {
      const [fl, ac, tr] = await Promise.all([
        sb.from('flights').select('*').eq('trip_id', tripId),
        sb.from('accommodations').select('*').eq('trip_id', tripId),
        sb.from('transports').select('*').eq('trip_id', tripId),
      ])
      context =
        `Trip Title: ${trip.title ?? ''}\n` +
        `When: ${trip.start_date ?? '—'} → ${trip.end_date ?? '—'}\n` +
        `Where: ${trip.location ?? '—'}\n` +
        `Desc: ${trip.description ?? '—'}\n` +
        `Counts: flights=${fl.data?.length ?? 0}, hotels=${ac.data?.length ?? 0}, transport=${tr.data?.length ?? 0}`
    }
  }

  // If no OpenAI key, degrade gracefully
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ reply: `AI key missing. Echo: ${message}` })
  }

  // Call OpenAI
  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      { role: 'system', content: 'You are a concise, helpful assistant for a business trip manager app. Produce concrete, actionable responses.' },
      ...(context ? [{ role: 'system', content: `Trip context:\n${context}` } as const] : []),
      { role: 'user', content: message }
    ]
  }

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify(body)
  })

  if (!r.ok) {
    const t = await r.text()
    return NextResponse.json({ error: `OpenAI error: ${t}` }, { status: 500 })
  }

  const j = await r.json()
  const reply = j?.choices?.[0]?.message?.content ?? 'No reply.'
  return NextResponse.json({ reply })
}
