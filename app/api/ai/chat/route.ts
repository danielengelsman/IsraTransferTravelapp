import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const sb = await createServerSupabase()

  // Try Authorization: Bearer <jwt>, then cookies (works on Netlify)
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined

  let user = null
  if (bearer) {
    const { data: u1 } = await sb.auth.getUser(bearer)
    user = u1?.user ?? null
  }
  if (!user) {
    const { data: u2 } = await sb.auth.getUser()
    user = u2?.user ?? null
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData()
  const prompt = String(form.get('prompt') ?? '')
  const trip_id = form.get('trip_id') ? String(form.get('trip_id')) : null
  const files: File[] = []
  for (const [k, v] of form.entries()) {
    if (k === 'files' && v instanceof File) files.push(v)
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 })

  try {
    const body = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You help create and structure business trip data.' },
        {
          role: 'user',
          content: [
            prompt || '(no free text prompt provided)',
            trip_id ? `Attach to trip_id: ${trip_id}` : 'No trip_id provided (suggest new trip contents).',
            files.length ? `Attached files: ${files.map(f => f.name).join(', ')}` : 'No files attached.',
          ].join('\n'),
        },
      ],
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!r.ok) {
      const txt = await r.text()
      return NextResponse.json({ error: `OpenAI error: ${txt}` }, { status: 500 })
    }

    const j = await r.json()
    const reply = j?.choices?.[0]?.message?.content ?? 'No reply.'
    return NextResponse.json({ reply, proposals: [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
