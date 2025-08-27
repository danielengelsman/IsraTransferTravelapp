'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Trip = { id: string; title: string | null; location: string | null; start_date: string | null; end_date: string | null }

export default function TripsPage() {
  const sb = useMemo(() => createClient(), [])
  const [status, setStatus] = useState<'loading'|'need-login'|'ready'|'error'>('loading')
  const [trips, setTrips] = useState<Trip[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { if (!cancelled) setStatus('need-login'); return }
      const { data, error } = await sb.from('trips').select('*').order('start_date', { ascending: true })
      if (cancelled) return
      if (error) { setMessage(error.message || 'Failed to load trips'); setStatus('error'); return }
      setTrips((data as Trip[]) || [])
      setStatus('ready')
    })()
    return () => { cancelled = true }
  }, [sb])

  if (status === 'loading') return <div className="card">Checking your session…</div>
  if (status === 'need-login') return <div className="card"><div className="mb-2">You’re not logged in.</div><Link className="btn-primary" href="/login?next=/trips">Go to Login</Link></div>
  if (status === 'error') return <div className="card text-red-600">{message}</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Trips</h1>
        <Link className="btn-primary" href="/trips/new">New Trip</Link>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {trips.map((t) => (
          <Link key={t.id} href={`/trips/${t.id}`} className="card hover:shadow">
            <div className="text-lg font-medium">{t.title || 'Untitled trip'}</div>
            <div className="text-sm text-gray-600">{t.location || '—'}</div>
            <div className="text-sm">{t.start_date || '—'} → {t.end_date || '—'}</div>
          </Link>
        ))}
      </div>
      {!trips.length && <div className="card">No trips yet.</div>}
    </div>
  )
}
