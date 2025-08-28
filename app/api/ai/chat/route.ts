// app/api/ai/chat/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const sb = createServerSupabase()

  // Make sure we have a user
  const { data: userData, error: userErr } = await sb.auth.getUser()
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Read the incoming form data
  const fd = await req.formData()
  const prompt = String(fd.get('prompt') || '')
  const tripId = String(fd.get('trip_id') || '')

  // TODO: call your OpenAI logic here and build proposals
  // For now, just echo back to verify 401s are gone:
  return NextResponse.json({
    reply: `OK, received: "${prompt}" ${tripId ? `(trip: ${tripId})` : ''}`,
    proposals: [],
  })
}
