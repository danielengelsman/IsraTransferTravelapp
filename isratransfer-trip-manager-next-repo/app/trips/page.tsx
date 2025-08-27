export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function TripsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/trips')

  const { data: trips } = await supabase
    .from('trips')
    .select('id,title,location,start_date,end_date')
    .order('start_date', { ascending: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Trips</h1>
        <Link className="btn-primary btn" href="/trips/new">New Trip</Link>
      </div>
      <div className="grid gap-3">
        {(trips ?? []).map((t) => (
          <Link key={t.id} href={`/trips/${t.id}`} className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-sm text-gray-600">{t.location}</div>
              </div>
              <div className="text-sm text-gray-600">{t.start_date} → {t.end_date}</div>
            </div>
          </Link>
        ))}
        {!trips?.length && <div className="text-gray-600">No trips yet.</div>}
      </div>
    </div>
  )
}
