'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState, Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useMe } from '@/lib/useMe'

type Trip = { id: string; title: string | null; created_by?: string | null }
type Proposal = {
  id: string
  kind: 'flight' | 'accommodation' | 'transport' | 'itinerary_event' | string
  summary?: string
  status?: 'new' | 'applied' | 'rejected'
  // allow extra fields from the API without typing them all
  [key: string]: any
}

function PageBody() {
  const sb = useMemo(() => createClient(), [])
  const me = useMe()

  // gate
  const [authState, setAuthState] = useState<'checking' | 'need-login' | 'ready'>('checking')
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      setAuthState(user ? 'ready' : 'need-login')
    })()
  }, [sb])

  // trips for selector
  const [trips, setTrips] = useState<Trip[]>([])
  const [tripId, setTripId] = useState<string>('')

  useEffect(() => {
    if (!me) return
    ;(async () => {
      const base = sb.from('trips').select('id,title,created_by').order('start_date', { ascending: true })
      const q = (me.role === 'admin' || me.role === 'finance') ? base : base.eq('created_by', me.id)
      const { data } = await q
      const rows = (data as Trip[]) || []
      setTrips(rows)
      if (rows.length && !tripId) setTripId(rows[0].id)
    })()
  }, [me, sb]) // eslint-disable-line react-hooks/exhaustive-deps

  // chat state
  const [prompt, setPrompt] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [reply, setReply] = useState<string>('')
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [error, setError] = useState<string>('')

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const f = Array.from(e.target.files || [])
    if (!f.length) return
    setFiles(prev => prev.concat(f))
    e.currentTarget.value = ''
  }

  async function sendToAI() {
    setError('')
    setReply('')
    setProposals([])
    if (!prompt.trim() && files.length === 0) {
      setError('Type a prompt or attach at least one file.')
      return
    }
    setSending(true)
    try {
      const fd = new FormData()
      fd.append('prompt', prompt.trim())
      if (tripId) fd.append('trip_id', tripId)
      files.forEach(f => fd.append('files', f, f.name))

      const res = await fetch('/api/ai/chat', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        setError(j?.error || 'AI request failed')
      } else {
        if (j.reply) setReply(String(j.reply))
        if (Array.isArray(j.proposals)) setProposals(j.proposals as Proposal[])
      }
    } catch (e: any) {
      setError(e?.message || 'Network error')
    } finally {
      setSending(false)
    }
  }

  async function actOnProposal(id: string, action: 'apply' | 'reject') {
    try {
      const res = await fetch(`/api/ai/proposals/${id}/${action}`, { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j?.error || `Could not ${action} proposal`)
        return
      }
      setProposals(prev =>
        prev.map(p => (p.id === id ? { ...p, status: action === 'apply' ? 'applied' : 'rejected' } : p))
      )
    } catch {
      alert('Network error')
    }
  }

  if (authState === 'need-login') {
    return (
      <div className="card" style={{ maxWidth: 520 }}>
        <h2>Login required</h2>
        <p>You need to log in to use the Trip AI Assistant.</p>
        <Link className="btn" href="/login?next=/ai">Go to Login</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="trip-cover" style={{ padding: 16, borderRadius: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Trip AI Assistant</h1>
        <div className="row-sub">Attach receipts/itineraries or describe the trip. The AI will draft flights, accommodation, transport and itinerary events.</div>
      </div>

      {/* Composer */}
      <div className="section-card" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 12 }}>
          <label className="block" style={{ gridColumn: '1 / -1' }}>
            <span className="label">Select Trip (optional)</span>
            <select className="input" value={tripId} onChange={e => setTripId(e.target.value)}>
              <option value="">— create suggestions without attaching to a trip —</option>
              {trips.map(t => (
                <option key={t.id} value={t.id}>{t.title || t.id}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Tell the assistant what to do</span>
            <textarea
              className="input"
              rows={4}
              placeholder="Example: 'Create a 3-day trip to NYC for a conference. Hotel near Javits Center. Flights from TLV around Oct 10–13.'"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
            />
          </label>

          <div className="block">
            <span className="label">Attachments</span>
            <input className="input" type="file" multiple onChange={onPickFiles}
              accept="image/*,.pdf,.eml,.msg,.txt,.doc,.docx,.xls,.xlsx" />
            {!!files.length && (
              <div style={{ marginTop: 8, maxHeight: 160, overflow: 'auto' }}>
                {files.map((f, i) => (
                  <div key={i} className="row" style={{ padding: 6 }}>
                    <div className="row-left"><div className="row-title" style={{ fontWeight: 600 }}>{f.name}</div></div>
                    <button className="btn" onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}>Remove</button>
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
          <button className="btn" onClick={() => { setPrompt(''); setFiles([]); setReply(''); setProposals([]); setError('') }}>
            Clear
          </button>
        </div>

        {!!error && <div style={{ marginTop: 10, color: '#b91c1c' }}>{error}</div>}
      </div>

      {/* Assistant reply */}
      {(reply || proposals.length > 0) && (
        <div className="trip-grid">
          <div className="stack">
            {reply && (
              <section className="section">
                <div className="section-head"><h2 className="section-title">Assistant Reply</h2></div>
                <div className="section-card"><pre style={{ whiteSpace: 'pre-wrap' }}>{reply}</pre></div>
              </section>
            )}
          </div>

          {/* Proposals column */}
          <div className="stack">
            <section className="section">
              <div className="section-head"><h2 className="section-title">Proposals</h2></div>
              <div className="section-card" style={{ display: 'grid', gap: 10 }}>
                {proposals.length === 0 ? (
                  <div className="row"><div className="row-left"><div className="row-title">No proposals returned.</div></div></div>
                ) : proposals.map(p => (
                  <div key={p.id} className="card" style={{ padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                      <div>
                        <div className="row-title" style={{ textTransform: 'capitalize' }}>
  {String(p.kind ?? '').replace(/_/g, ' ')}
</div>
                        {p.summary && <div className="row-sub">{p.summary}</div>}
                      </div>
                      <span className="badge">{p.status || 'new'}</span>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <button className="btn-primary" disabled={p.status === 'applied'} onClick={() => actOnProposal(p.id, 'apply')}>Apply</button>
                      <button className="btn" disabled={p.status === 'rejected'} onClick={() => actOnProposal(p.id, 'reject')}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AiPage() {
  return (
    <Suspense fallback={<div className="card">Loading assistant…</div>}>
      <PageBody />
    </Suspense>
  )
}
