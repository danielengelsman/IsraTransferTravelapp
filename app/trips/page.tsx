'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useMe } from '@/lib/useMe'

type TripStatus = 'draft' | 'awaiting_approval' | 'approved'
type Trip = {
  id: string
  title: string | null
  location: string | null
  description: string | null
  start_date: string | null
  end_date: string | null
  status: TripStatus
  created_by?: string | null
}

function niceDate(d?: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  return isNaN(+dt) ? '—' : dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
}

function StatusBadge({ status }: { status: TripStatus }) {
  const color =
    status === 'approved' ? '#16a34a' : status === 'awaiting_approval' ? '#ca8a04' : '#6b7280'
  return (
    <span
      className="badge"
      style={{ background: 'transparent', border: `1px solid ${color}`, color, fontWeight: 700 }}
    >
      {status.toUpperCase()}
    </span>
  )
}

export default function TripsPage() {
  const sb = useMemo(() => createClient(), [])
  const me = useMe()
  const router = useRouter()

  const [pageState, setPageState] = useState<'checking' | 'need-login' | 'ready' | 'error'>('checking')
  const [message, setMessage] = useState('')
  const [trips, setTrips] = useState<Trip[]>([])
  const [showNew, setShowNew] = useState(false)

  // New trip form
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')

  // 1) Gate by auth (if not logged in → show login)
  useEffect(() => {
    let cancel = false
    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (cancel) return
      if (!user) { setPageState('need-login'); return }
      setPageState('ready')
    })()
    return () => { cancel = true }
  }, [sb])

  // 2) Load trips once we know the role
  useEffect(() => {
    if (!me) return
    ;(async () => {
      try {
        const base = sb.from('trips').select('*').order('start_date', { ascending: true })
        const query = (me.role === 'admin' || me.role === 'finance')
          ? base
          : base.eq('created_by', me.id)
        const { data, error } = await query
        if (error) throw error
        setTrips((data as Trip[]) || [])
      } catch (e: any) {
        setMessage(e?.message || 'Failed to load trips')
        setPageState('error')
      }
    })()
  }, [me, sb])

  async function createTrip() {
    try {
      if (!title.trim()) { alert('Please add a trip title'); return }
      const payload = {
        title: title.trim(),
        location: location.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        description: description.trim() || null,
        // created_by will be auto-filled by the trigger
        status: 'draft' as TripStatus
      }
      const { data, error } = await sb.from('trips').insert(payload).select().single()
      if (error) throw error
      // Go straight to the trip page
      router.push(`/trips/${data!.id}`)
    } catch (e: any) {
      alert(e?.message || 'Could not create trip')
    }
  }

  if (pageState === 'need-login') {
    return (
      <div className="card" style={{ maxWidth: 520 }}>
        <h2>Login required</h2>
        <p>You need to log in to view trips.</p>
        <Link className="btn" href="/login?next=/trips">Go to Login</Link>
      </div>
    )
  }

  if (pageState === 'error') {
    return <div className="card" style={{ color: '#b91c1c' }}>{message}</div>
  }

  // MAIN
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="trip-cover" style={{ padding: 16, borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Trips</h1>
            <div style={{ opacity: 0.9 }}>
              {me ? (
                <span>Signed in as <strong>{me.role.toUpperCase()}</strong></span>
              ) : (
                <span>Loading your role…</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link className="btn" href="/">Home</Link>
            <button className="btn-primary" onClick={() => setShowNew(s => !s)}>
              {showNew ? 'Cancel' : 'New Trip'}
            </button>
          </div>
        </div>
      </div>

      {/* New Trip form */}
      {showNew && (
        <div className="section-card" style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            <label className="block">
              <span className="label">Title</span>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. London Property Expo" />
            </label>
            <label className="block">
              <span className="label">Location (city / country)</span>
              <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. London, UK" />
            </label>
            <label className="block">
              <span className="label">Start date</span>
              <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </label>
            <label className="block">
              <span className="label">End date</span>
              <input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </label>
            <label className="block" style={{ gridColumn: '1 / -1' }}>
              <span className="label">Description</span>
              <textarea className="input" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this trip about?" />
            </label>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={createTrip}>Create trip</button>
            <button className="btn" onClick={() => setShowNew(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Trips grid/list */}
      <div className="section-card" style={{ padding: 0 }}>
        {trips.length === 0 ? (
          <div className="card" style={{ margin: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="row-title">No trips yet</div>
                <div className="row-sub">Click “New Trip” to add your first one.</div>
              </div>
              <button className="btn" onClick={() => setShowNew(true)}>New Trip</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, padding: 12 }}>
            {trips.map((t) => (
              <Link
                key={t.id}
                href={`/trips/${t.id}`}
                className="card"
                style={{ textDecoration: 'none', color: 'inherit', padding: 14, display: 'grid', gap: 6 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2, minHeight: 40 }}>
                    {t.title || 'Untitled Trip'}
                  </div>
                  <StatusBadge status={(t.status || 'draft') as TripStatus} />
                </div>
                <div className="row-sub">
                  {t.location || '—'}
                </div>
                <div className="row-sub">
                  {niceDate(t.start_date)} → {niceDate(t.end_date)}
                </div>
                {t.description && (
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                    {t.description.length > 140 ? t.description.slice(0, 140) + '…' : t.description}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
