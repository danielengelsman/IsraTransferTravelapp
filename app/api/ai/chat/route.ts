import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs' // ensure cookies work in this environment

export async function POST(req: NextRequest) {
  try {
    // ✅ no args, and awaited
    const sb = await createServerSupabase()

    // auth gate (cookie-based)
    const { data: { user }, error: authErr } = await sb.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // read form data from the client
    const form = await req.formData()
    const prompt = (form.get('prompt') as string) || ''
    const tripId = (form.get('trip_id') as string) || null
    const _files = form.getAll('files') as File[] // (optional) not used below

    // --- Call OpenAI (simple reply). You can enrich this later to emit proposals. ---
    const openaiKey = process.env.OPENAI_API_KEY
    let reply = ''
    let proposals: any[] = []

    if (openaiKey) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
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
              content:
                prompt || 'Create suggestions based on the attached receipts/itineraries.',
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

    // You can optionally write proposals to `ai_proposals` here.
    // For now we just return the text reply and an empty proposals array.
    return NextResponse.json({ reply, proposals, trip_id: tripId })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
