import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    // ---- Auth (works with Supabase cookies OR client Bearer token) ----
    const sb = await createServerSupabase()
    let { data: { user } } = await sb.auth.getUser()

    if (!user) {
      const auth = req.headers.get('authorization') || ''
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
      if (token) {
        // Recreate a Supabase client that trusts the incoming Bearer token
        // (avoids cookie issues in some hosts)
        const { createClient } = await import('@supabase/supabase-js')
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
        const s2 = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } } })
        const g = await s2.auth.getUser()
        user = g.data.user || null
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ---- Parse form-data ----
    const ct = req.headers.get('content-type') || ''
    let prompt = ''
    let tripId: string | null = null

    if (ct.includes('multipart/form-data')) {
      const form = await req.formData()
      prompt = String(form.get('prompt') ?? '')
      tripId = (form.get('trip_id') ? String(form.get('trip_id')) : '') || null
      // Files are available via `form.getAll('files')`, not used here yet.
    } else {
      const body = await req.json().catch(() => ({}))
      prompt = String(body.prompt ?? '')
      tripId = body.trip_id ? String(body.trip_id) : null
    }

    if (!prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // ---- Call OpenAI (simple echo implementation) ----
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Server missing OPENAI_API_KEY' }, { status: 500 })
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are Trip AI. Draft structured, concise suggestions.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    })

    if (!r.ok) {
      const txt = await r.text()
      return NextResponse.json({ error: `OpenAI error: ${txt}` }, { status: 500 })
    }

    const j: any = await r.json()
    const reply: string = j?.choices?.[0]?.message?.content ?? 'No reply.'
    // If/when you generate actionable proposals, return them in this array
    return NextResponse.json({ reply, proposals: [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
