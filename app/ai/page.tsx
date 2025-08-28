'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

type ProposalStatus = 'new' | 'applied' | 'rejected'
type ProposalKind =
  | 'flight'
  | 'accommodation'
  | 'transport'
  | 'itinerary_event'
  | 'note'
  | 'other'

type Proposal = {
  id: string
  trip_id: string | null
  kind: ProposalKind
  summary?: string | null
  payload?: any
  status?: ProposalStatus
}

type TripLite = { id: string; title: string | null }

export default function TripAIPage() {
  const sb = useMemo(() => createClient(), [])

  // Auth gate
  const [auth, setAuth] = useState<'checking' | 'need-login' | 'ready'>('checking')

  // UI state
  const [trips, setTrips] = useState<TripLite[]>([])
  const [tripId, setTripId] = useState<string>('')

  const [prompt, setPrompt] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)

  const [reply, setReply] = useState('')
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [error, setError] = useState('')

  // ----- Auth + initial data -----
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) {
        if (!cancelled) setAuth('need-login')
        return
      }
      // load minimal trips for selector
      const { data: t } = await sb
        .from('trips')
        .select('id,title')
        .order('start_date', { ascending: false })
        .limit(100)

      if (!cancelled) {
        setTrips((t as TripLite[]) || [])
        setAuth('ready')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sb])

  // ----- File picker -----
  function onPickFiles(e: any) {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return
    setFiles(prev => [...prev, ...selected])
  }

  // ----- Send to AI (includes Bearer token) -----
  async function sendToAI() {
    setError('')
    setReply('')
    setProposals([])

    if (!prompt && files.length === 0) {
      setError('Please enter a prompt or attach files.')
      return
    }

    setSending(true)
    try {
      const fd = new FormData()
      if (prompt) fd.append('prompt', prompt)
      if (tripId) fd.append('trip_id', tripId)
      files.forEach(f => fd.append('files', f, f.name))

      // get session token and send it
      const { data: { session } } = await sb.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      const j = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        setError(j?.error || 'AI request failed')
        return
      }
      setReply(j?.reply || '')
      setProposals(Array.isArray(j?.proposals) ? j.proposals : [])
    } catch (e: any) {
      setError(e?.message || 'Network error')
    } finally {
      setSending(false)
    }
  }

  // ----- Apply/Reject with Supabase session token -----
  async function actOnProposal(id: string, action: 'apply' | 'reject') {
    const { data: { session } } = await sb.auth.getSession()
    const token = session?.access_token

    const res = await fetch(`/api/ai/proposals/${id}/${action}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    const j = await res.json().catch(() => ({} as any))
    if (!res.ok) {
      alert(j?.error || `${action} failed`)
      return
    }

    // optimistic UI
    setProposals(prev =>
      prev.map(p =>
        p.id === id ? { ...p, status: action === 'apply' ? 'applied' : 'rejected' } : p
      )
    )
  }

  // ----- Auth screens -----
  if (auth === 'checking') {
    return <div className="card">Loading…</div>
  }
  if (auth === 'need-login') {
    return (
      <div className="card" style={{ maxWidth: 520 }}>
        <h2>Login required</h2>
        <p>You need to log in to use the Trip AI Assistant.</p>
        <Link className="btn" href="/login?next=/ai">
          Go to Login
        </Link>
      </div>
    )
  }

  // ----- Main UI -----
  return (
    <div className="space-y-6">
      <div className="trip-cover" style={{ padding: 16, borderRadius: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Trip AI Assistant</h1>
        <div className="row-sub">
          Attach receipts/itineraries or describe the trip. The AI will draft flights,
          accommodation, transport and itinerary events.
        </div>
      </div>

      {/* Composer */}
      <div className="section-card" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 12 }}>
          <label className="block" style={{ gridColumn: '1 / -1' }}>
            <span className="label">Select Trip (optional)</span>
            <select className="input" value={tripId} onChange={e => setTripId(e.target.value)}>
              <option value="">— create suggestions without attaching to a trip —</option>
              {trips.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title || t.id}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Tell the assistant what to do</span>
            <textarea
              className="input"
              rows={4}
              placeholder="Example: “Create a 3-day trip to NYC for a conference. Hotel near Javits Center. Flights from TLV around Oct 10–13.”"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
            />
          </label>

          <div className="block">
            <span className="label">Attachments</span>
            <input
              className="input"
              type="file"
              multiple
              onChange={onPickFiles}
              accept="image/*,.pdf,.eml,.msg,.txt,.doc,.docx,.xls,.xlsx"
            />
            {!!files.length && (
              <div style={{ marginTop: 8, maxHeight: 160, overflow: 'auto' }}>
                {files.map((f, i) => (
                  <div key={i} className="row" style={{ padding: 6 }}>
                    <div className="row-left">
                      <div className="row-title" style={{ fontWeight: 600 }}>{f.name}</div>
                    </div>
                    <button
                      className="btn"
                      onClick={() =>
                        setFiles(prev => prev.filter((_, idx) => idx !== i))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="btn-primary" disabled={sending} onClick={sendToAI}>
            {sending ? 'Sending…' : 'Send to AI'}
          </button>
          <button
            className="btn"
            onClick={() => {
              setPrompt('')
              setFiles([])
              setReply('')
              setProposals([])
              setError('')
            }}
          >
            Clear
          </button>
        </div>

        {!!error && <div style={{ marginTop: 10, color: '#b91c1c' }}>{error}</div>}
      </div>

      {/* Assistant reply + Proposals */}
      {(reply || proposals.length > 0) && (
        <div className="trip-grid">
          <div className="stack">
            {!!reply && (
              <section className="section">
                <div className="section-head">
                  <h2 className="section-title">Assistant Reply</h2>
                </div>
                <div className="section-card">
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{reply}</pre>
                </div>
              </section>
            )}
          </div>

          {/* Proposals */}
          <div className="stack">
            <section className="section">
              <div className="section-head">
                <h2 className="section-title">Proposals</h2>
              </div>
              <div className="section-card" style={{ display: 'grid', gap: 10 }}>
                {proposals.length === 0 ? (
                  <div className="row">
                    <div className="row-left">
                      <div className="row-title">No proposals returned.</div>
                    </div>
                  </div>
                ) : (
                  proposals.map(p => (
                    <div key={p.id} className="card" style={{ padding: 12 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'start',
                          gap: 8,
                        }}
                      >
                        <div>
                          <div className="row-title" style={{ textTransform: 'capitalize' }}>
                            {String(p.kind ?? '').replace(/_/g, ' ')}
                          </div>
                          {p.summary && <div className="row-sub">{p.summary}</div>}
                        </div>
                        <span className="badge">{p.status || 'new'}</span>
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                        <button
                          className="btn-primary"
                          disabled={p.status === 'applied'}
                          onClick={() => actOnProposal(p.id, 'apply')}
                        >
                          Apply
                        </button>
                        <button
                          className="btn"
                          disabled={p.status === 'rejected'}
                          onClick={() => actOnProposal(p.id, 'reject')}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
