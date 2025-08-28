import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient as createSbClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    // Try to read a Bearer token (client now sends it)
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined

    // Prefer Bearer; otherwise fall back to cookie-based server client
    const sb = token
      ? createSbClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { global: { headers: { Authorization: `Bearer ${token}` } } }
        )
      : await createServerSupabase()

    const { data: { user } } = await sb.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Read form data
    const form = await req.formData()
    const prompt = (form.get('prompt') as string) || ''
    const tripId = (form.get('trip_id') as string) || null
    const _files = form.getAll('files') as File[] // available if you want to parse them

    // Call OpenAI (simple reply)
    const openaiKey = process.env.OPENAI_API_KEY
    let reply = ''
    let proposals: any[] = []

    if (openaiKey) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content:
                'You are Trip AI for a travel planner app. Be concise. When possible, output structured bullet points for flights, accommodation, transport, and itinerary.',
            },
            {
              role: 'user',
              content: prompt || 'Create suggestions based on the attached receipts/itineraries.',
            },
          ],
        }),
      })
      if (!r.ok) {
        const txt = await r.text()
        return NextResponse.json({ error: `OpenAI error: ${txt}` }, { status: 500 })
      }
      const j = await r.json()
      reply = j?.choices?.[0]?.message?.content ?? ''
    } else {
      reply = 'Set OPENAI_API_KEY to enable AI replies.'
    }

    return NextResponse.json({ reply, proposals, trip_id: tripId })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
