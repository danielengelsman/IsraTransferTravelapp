'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Trip = {
  id: string
  title: string | null
  location: string | null
  start_date: string | null
  end_date: string | null
}

export default function TripsPage() {
  const sb = createClient()
  const [status, setStatus] = useState<'checking' | 'ready' | 'need-login' | 'error'>('checking')
  const [trips, setTrips] = useState<Trip[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    // ✅ Add explicit types so TS is happy
    let unsub: (() => void) | undefined
    let timeout: ReturnType<typeof setTimeout>

    async function loadTrips() {
      try {
        const { data, error } = await sb
          .from('trips')
          .select('*')
          .order('start_date', { ascending: true })
        if (error) throw error
        setTrips((data as Trip[]) || [])
        setStatus('ready')
      } catch (e: any) {
        setMessage(e?.message || 'Failed to load trips')
        setStatus('error')
      }
    }

    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        await loadTrips()
        return
      }
      const { data: listener } = sb.auth.onAuthStateChange((_evt, session) => {
        if (session?.user) {
          clearTimeout(timeout)
          loadTrips()
        }
      })
      // ✅ Define unsubscribe as a function
      unsub = () => listener.subscription.unsubscribe()
      timeout = setTimeout(() => setStatus('need-login'), 5000)
    })()

    return () => {
      try { unsub?.() } catch {}
      clearTimeout(timeout)
    }
  }, [sb])

  if (status === 'checking') return <div className="card">Checking your session…</div>
  if (status === 'need-login') {
    return (
      <div className="card">
        <div className="mb-2">You’re not logged in.</div>
        <Link className="btn-primary" href="/login?next=/trips">Go to Login</Link>
      </div>
    )
  }
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
