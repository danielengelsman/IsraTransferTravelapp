'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Trip = {
  id: string
  title: string | null
  location: string | null
  start_date: string | null
  end_date: string | null
}

export default function TripsPage() {
  const sb = createClient()
  const [status, setStatus] = useState<'loading'|'ready'|'need-login'|'error'>('loading')
  const [trips, setTrips] = useState<Trip[]>([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!mounted) return
      if (!user) { setStatus('need-login'); return }

      const { data, error } = await sb
        .from('trips')
        .select('id,title,location,start_date,end_date')
        .order('start_date', { ascending: true })

      if (error) { setMsg(error.message); setStatus('error'); return }
      setTrips((data as Trip[]) || [])
      setStatus('ready')
    })()
    return () => { mounted = false }
  }, [sb])

  if (status === 'loading') return <div className="card">Loading…</div>
  if (status === 'need-login') return <div className="card">Please <Link href="/login">log in</Link> to view your trips.</div>
  if (status === 'error') return <div className="card" style={{color:'#b91c1c'}}>{msg}</div>

  return (
    <div>
      <h1 className="page-title">Trips</h1>
      <div className="actions">
        <Link href="/trips/new" className="btn-primary">New Trip</Link>
      </div>

      {trips.length === 0 ? (
        <div className="card">No trips yet. Click <strong>New Trip</strong> to add your first one.</div>
      ) : (
        <div className="grid-two">
          {trips.map(t => (
            <Link key={t.id} href={`/trips/${t.id}`} className="card trip-link">
              <div className="trip-title">{t.title || 'Untitled trip'}</div>
              <div className="muted">{t.location || '—'}</div>
              <div className="muted">{t.start_date || '—'} → {t.end_date || '—'}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
