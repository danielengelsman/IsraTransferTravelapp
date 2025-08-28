// app/api/ai/chat/route.ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const sb = await createServerSupabase()

  // Try bearer first (we send it from the client),
  // then fall back to cookies.
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
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse multipart form (prompt + optional files + optional trip_id)
  const form = await request.formData()
  const prompt = String(form.get('prompt') ?? '')
  const trip_id = form.get('trip_id') ? String(form.get('trip_id')) : null
  const files: File[] = []
  for (const [k, v] of form.entries()) {
    if (k === 'files' && v instanceof File) files.push(v)
  }

  // (Optional) You might want to stash files to storage here and pass their URLs to the model

  // Minimal call to OpenAI (replace with your preferred call/params)
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 })
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You help create and structure business trip data.' },
          { role: 'user', content: makeUserPrompt(prompt, trip_id, files.map(f => f.name)) },
        ],
      }),
    })

    if (!r.ok) {
      const txt = await r.text()
      return NextResponse.json({ error: `OpenAI error: ${txt}` }, { status: 500 })
    }

    const j = await r.json()
    const reply = j?.choices?.[0]?.message?.content ?? 'No reply.'
    // You can also create proposal rows here if you want
    return NextResponse.json({ reply, proposals: [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

function makeUserPrompt(prompt: string, trip_id: string | null, filenames: string[]) {
  const parts = [
    prompt || '(no free text prompt provided)',
    trip_id ? `Attach to trip_id: ${trip_id}` : 'No trip_id provided (suggest new trip contents).',
    filenames.length ? `Attached files: ${filenames.join(', ')}` : 'No files attached.',
  ]
  return parts.join('\n')
}
