import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// IMPORTANT: use Request + { params } here (not NextRequest)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : undefined
  const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } as any }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const proposal = body?.proposal || body
  if (!proposal?.kind) return NextResponse.json({ error: 'Missing proposal payload' }, { status: 400 })

  const payload = { ...(proposal.payload || {}), created_by: user.id }

  let result: any
  switch (String(proposal.kind)) {
    case 'note':
      result = await supabase.from('notes').insert(payload).select('*').single()
      break
    case 'accommodation':
      result = await supabase.from('accommodations').insert(payload).select('*').single()
      break
    case 'transport':
      result = await supabase.from('transports').insert(payload).select('*').single()
      break
    case 'itinerary_event':
      result = await supabase.from('itinerary_events').insert(payload).select('*').single()
      break
    default:
      return NextResponse.json({ error: `Unsupported proposal kind: ${proposal.kind}` }, { status: 400 })
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 })
  return NextResponse.json({ ok: true, inserted: result.data })
}
