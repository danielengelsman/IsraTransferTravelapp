'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function TripsPage() {
  const sb = createClient()
  const [loading, setLoading] = useState(true)
  const [trips, setTrips] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) {
        window.location.href = '/login?next=/trips'
        return
      }
      const { data, error } = await sb
        .from('trips')
        .select('*')
        .order('start_date', { ascending: true })
      if (error) setError(error.message)
      setTrips(data || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="card">Loading…</div>
  if (error) return <div className="card text-red-600">Error: {error}</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Trips</h1>
        <Link className="btn-primary" href="/trips/new">New Trip</Link>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {trips.map((t) => (
          <Link key={t.id} href={`/trips/${t.id}`} className="card hover:shadow">
            <div className="text-lg font-medium">{t.title}</div>
            <div className="text-sm text-gray-600">{t.location || '—'}</div>
            <div className="text-sm">{t.start_date || '—'} → {t.end_date || '—'}</div>
          </Link>
        ))}
      </div>
      {!trips.length && <div className="card">No trips yet.</div>}
    </div>
  )
}
