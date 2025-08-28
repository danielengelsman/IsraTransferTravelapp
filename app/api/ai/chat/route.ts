// app/api/ai/chat/route.ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const sb = await createServerSupabase()   // <-- await here

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2) Read input (works with JSON or multipart form)
    let prompt = ''
    const ct = req.headers.get('content-type') || ''
    if (ct.includes('multipart/form-data')) {
      const fd = await req.formData()
      prompt = String(fd.get('prompt') ?? '')
      // Note: fd.getAll('files') available if you later need to read uploads
    } else if (ct.includes('application/json')) {
      const body = await req.json().catch(() => ({} as any))
      prompt = String(body?.prompt ?? '')
    }

    // 3) Call OpenAI (ensure OPENAI_API_KEY is set in Netlify)
    const sys =
      'You are a helpful Trip Assistant. Return concise, bullet-point suggestions for flights, accommodation, transport, and itinerary.'
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: prompt || 'Draft travel suggestions.' },
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
    // You can also return proposals: [] here if you generate them
    return NextResponse.json({ reply, proposals: [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
