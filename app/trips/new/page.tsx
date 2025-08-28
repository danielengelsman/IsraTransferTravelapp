'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type TripStatus = 'draft' | 'awaiting_approval' | 'approved'

export default function NewTripPage() {
  const sb = useMemo(() => createClient(), [])
  const router = useRouter()

  const [ok, setOk] = useState<'checking'|'ready'|'need-login'>('checking')
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      setOk(user ? 'ready' : 'need-login')
    })()
  }, [sb])

  async function createTrip() {
    if (!title.trim()) { alert('Please add a trip title'); return }
    const payload = {
      title: title.trim(),
      location: location.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      description: description.trim() || null,
      status: 'draft' as TripStatus, // created_by is set by DB trigger
    }
    const { data, error } = await sb.from('trips').insert(payload).select().single()
    if (error) { alert(error.message); return }
    router.push(`/trips/${data!.id}`)
  }

  if (ok === 'need-login') {
    return (
      <div className="card" style={{ maxWidth: 520 }}>
        <h2>Login required</h2>
        <p>You need to log in to create trips.</p>
        <Link className="btn" href="/login?next=/trips/new">Go to Login</Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
      {/* reuse sidebar on this page if you want: <Sidebar /> */}
      <div />
      <div className="space-y-6">
        <div className="trip-cover" style={{ padding: 16, borderRadius: 16 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>New Trip</h1>
        </div>

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
            <Link className="btn" href="/trips">Cancel</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
