// app/api/ai/trips/[tripId]/apply/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(req: NextRequest, ctx: any) {
  try {
    const tripId: string | undefined = ctx?.params?.tripId
    if (!tripId) {
      return NextResponse.json({ error: 'Missing tripId in route' }, { status: 400 })
    }

    const sb = await createServerSupabase()
    const { data: { user }, error: authErr } = await sb.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Read form data (prompt optional, files optional)
    const form = await req.formData()
    const prompt = String(form.get('prompt') || '').trim()
    const files = form.getAll('files') as File[]

    // ---- TODO: your AI + DB insert logic goes here ----
    // For now we just return what we received so the UI can proceed.
    // (No "No files uploaded" error; text-only is allowed.)
    return NextResponse.json({
      ok: true,
      received: {
        tripId,
        prompt,
        files: files.map(f => ({ name: f.name, size: f.size, type: f.type })),
      },
      // shape the UI expects – empty applied result for now
      applied: {
        flights: [],
        accommodations: [],
        transports: [],
        itinerary_events: [],
        errors: [],
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
