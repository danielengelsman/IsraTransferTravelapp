export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function TripsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/trips')

  const { data: trips } =
    await supabase.from('trips').select('*').order('start_date', { ascending: true })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Trips</h1>
        <Link className="btn-primary" href="/trips/new">New Trip</Link>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {(trips ?? []).map((t) => (
          <Link key={t.id} href={`/trips/${t.id}`} className="card hover:shadow">
            <div className="text-lg font-medium">{t.title}</div>
            <div className="text-sm text-gray-600">{t.location || '—'}</div>
            <div className="text-sm">{t.start_date || '—'} → {t.end_date || '—'}</div>
          </Link>
        ))}
      </div>
      {!trips?.length && <div className="card">No trips yet.</div>}
    </div>
  )
}
