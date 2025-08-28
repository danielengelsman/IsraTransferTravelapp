// app/api/ai/chat/route.ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs' // ensure Node runtime for FormData/File

export async function POST(req: Request) {
  const sb = await createServerSupabase()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Server missing OPENAI_API_KEY' }, { status: 500 })

  try {
    const form = await req.formData()
    const prompt = (form.get('prompt') as string) ?? ''
    const tripId = (form.get('trip_id') as string) || ''
    const files = (form.getAll('files') as File[]) || []

    // Build a simple message. (You can enrich with OCR/text later.)
    const filenames = files.map(f => f.name).join(', ')
    const userMsg =
      `${prompt}${filenames ? `\n\nAttached files: ${filenames}` : ''}${tripId ? `\nTrip context: ${tripId}` : ''}`

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a Trip AI assistant. Extract flights, accommodation, transport, and itinerary items from the user prompt and attachments. Summarize clearly.',
          },
          { role: 'user', content: userMsg },
        ],
        temperature: 0.2,
      }),
    })

    if (!r.ok) {
      const txt = await r.text()
      return NextResponse.json({ error: `OpenAI error: ${txt}` }, { status: 500 })
    }

    const j = (await r.json()) as any
    const reply = j?.choices?.[0]?.message?.content ?? 'No reply.'
    // For now just return text; proposals can be added later
    return NextResponse.json({ reply, proposals: [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
