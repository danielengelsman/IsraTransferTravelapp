'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AiPage() {
  const sb = useMemo(() => createClient(), [])
  const [auth, setAuth] = useState<'checking'|'need'|'ready'>('checking')
  const [prompt, setPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [reply, setReply] = useState('')
  const [tripId, setTripId] = useState<string | null>(null)
  const [err, setErr] = useState('')

  // check auth once
  useMemo(() => {
    sb.auth.getUser().then(({ data: { user } }) => {
      setAuth(user ? 'ready' : 'need')
    })
  }, [sb])

  if (auth === 'checking') return <div className="card">Loading…</div>
  if (auth === 'need') return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2>Login required</h2>
      <p>You need to log in to use the Trip AI Assistant.</p>
      <Link className="btn" href="/login?next=/ai">Go to Login</Link>
    </div>
  )

  async function onSend() {
    setErr(''); setReply(''); setTripId(null)
    if (!prompt.trim()) { setErr('Please enter what to create.'); return }
    setSending(true)
    try {
      const res = await fetch('/api/ai/make-trip', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const j = await res.json()
      if (!res.ok) { setErr(j?.error || 'Request failed'); return }
      setReply(j.reply || 'Trip created.')
      setTripId(j.trip_id || null)
    } catch (e: any) {
      setErr(e?.message || 'Network error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="trip-cover" style={{ padding: 16, borderRadius: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Trip AI Assistant</h1>
        <div className="row-sub">Describe the trip. I’ll create it in your account.</div>
      </div>

      <div className="section-card" style={{ padding: 16 }}>
        <label className="block">
          <span className="label">Tell the assistant what to do</span>
          <textarea className="input" rows={4}
            placeholder={`Example: "Create a new trip to Chicago, Apr 1–4".`}
            value={prompt} onChange={e => setPrompt(e.target.value)} />
        </label>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="btn-primary" disabled={sending} onClick={onSend}>
            {sending ? 'Creating…' : 'Send to AI'}
          </button>
          <button className="btn" onClick={() => { setPrompt(''); setReply(''); setErr(''); setTripId(null) }}>
            Clear
          </button>
        </div>
        {!!err && <div style={{ marginTop: 10, color: '#b91c1c' }}>{err}</div>}
      </div>

      {(reply || tripId) && (
        <div className="trip-grid">
          <div className="stack">
            <section className="section">
              <div className="section-head"><h2 className="section-title">Assistant Reply</h2></div>
              <div className="section-card">
                <p>{reply}</p>
                {tripId && <p>Open trip: <Link className="link" href={`/trips/${tripId}`}>{tripId}</Link></p>}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
