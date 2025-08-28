import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const sb = createServerSupabase(req)
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await req.formData()
  const prompt = (form.get('prompt') as string) || ''
  const tripId = (form.get('trip_id') as string) || null
  // files are available with form.getAll('files') if/when you need them

  // ---- Call OpenAI (simple baseline) ----
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a Trip AI assistant for a travel ops app. Always output clear, structured suggestions for flights, accommodation, transport and itinerary items. If trip_id is provided, tailor suggestions to that trip.',
        },
        {
          role: 'user',
          content:
            tripId
              ? `Trip ID: ${tripId}\n\nUser request: ${prompt}`
              : prompt,
        },
      ],
      temperature: 0.2,
    }),
  })

  if (!r.ok) {
    const txt = await r.text()
    return NextResponse.json({ error: `OpenAI error: ${txt}` }, { status: 500 })
  }

  const j = await r.json()
  const reply = j?.choices?.[0]?.message?.content ?? 'No reply.'

  // You can also parse the reply and create ai_proposals rows here.

  return NextResponse.json({ reply, proposals: [] })
}
