import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type AiTrip = {
  trip: {
    title: string
    dest_city?: string
    dest_country?: string
    start_date?: string   // ISO date
    end_date?: string     // ISO date
  }
}

export async function POST(req: Request) {
  try {
    const sb = createServerSupabase()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { prompt } = await req.json()
    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })

    // Ask OpenAI for STRICT JSON
    const sys = `You are a travel trip builder. 
Return ONLY compact JSON matching this TypeScript type exactly (no prose, no markdown):
type AiTrip = { trip: { title: string; dest_city?: string; dest_country?: string; start_date?: string; end_date?: string } }.
Dates must be ISO (YYYY-MM-DD). If unsure, omit the field.`
    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      },
      body: JSON.stringify(payload),
    })
    if (!r.ok) {
      const t = await r.text()
      return NextResponse.json({ error: `OpenAI error: ${t}` }, { status: 500 })
    }
    const jj = await r.json()
    let parsed: AiTrip | null = null
    try { parsed = JSON.parse(jj.choices?.[0]?.message?.content || '{}') } catch { parsed = null }

    // Fallback if model misbehaves
    const tripInput = parsed?.trip ?? { title: prompt.slice(0, 80) }

    // Insert trip
    const { data, error } = await sb.from('trips').insert({
      created_by: user.id,
      title: tripInput.title || 'New Trip',
      dest_city: tripInput.dest_city || null,
      dest_country: tripInput.dest_country || null,
      start_date: tripInput.start_date || null,
      end_date: tripInput.end_date || null,
    }).select('id,title').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({
      ok: true,
      trip_id: data.id,
      reply: `Created trip: ${data.title}`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
