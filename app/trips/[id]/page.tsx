'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Trip = {
  id: string
  title: string | null
  location: string | null
  start_date: string | null
  end_date: string | null
  created_at?: string | null
}

export default function TripDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id?.toString()
  const sb = useMemo(() => createClient(), [])

  const [status, setStatus] = useState<'loading' | 'need-login' | 'ready' | 'not-found' | 'error'>('loading')
  const [trip, setTrip] = useState<Trip | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false

    ;(async () => {
      // single check; no onAuthStateChange (prevents loops)
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { if (!cancelled) setStatus('need-login'); return }

      const { data, error } = await sb.from('trips').select('*').eq('id', id).single()
      if (cancelled) return
      if (error) { setMessage(error.message || 'Failed to load trip'); setStatus('error'); return }
      if (!data) { setStatus('not-found'); return }
      setTrip(data as Trip)
      setStatus('ready')
    })()

    return () => { cancelled = true }
  }, [id, sb])

  if (status === 'loading') return <div className="card">Loading…</div>
  if (status === 'need-login') return (
    <div className="card">
      <div className="mb-2">You’re not logged in.</div>
      <Link className="btn-primary" href="/login?next=/trips">Go to Login</Link>
    </div>
  )
  if (status === 'not-found') return (
    <div className="card">
      <div className="mb-2">Trip not found.</div>
      <Link className="btn" href="/trips">Back to Trips</Link>
    </div>
  )
  if (status === 'error') return <div className="card text-red-600">{message}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{trip?.title || 'Untitled trip'}</h1>
        <Link className="btn" href="/trips">Back to Trips</Link>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="text-sm text-gray-600">Location</div>
          <div className="text-lg">{trip?.location || '—'}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Dates</div>
          <div className="text-lg">{trip?.start_date || '—'} → {trip?.end_date || '—'}</div>
        </div>
      </div>
      <div className="card">
        <div className="text-sm text-gray-600">Trip ID</div>
        <div className="font-mono text-sm">{trip?.id}</div>
      </div>
    </div>
  )
}
