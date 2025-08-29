'use client'
import { useState } from 'react'

export default function TripAIForm({ tripId }: { tripId: string }) {
  const [prompt, setPrompt] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [err, setErr] = useState<string>('')

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sel = Array.from(e.target.files || []) as File[]
    if (!sel.length) return
    setFiles(prev => [...prev, ...sel])
  }

  async function send() {
    setErr(''); setResult(null); setSending(true)
    try {
      const fd = new FormData()
      if (prompt) fd.append('prompt', prompt)
      files.forEach(f => fd.append('files', f, f.name))
      const res = await fetch(`/api/ai/trips/${tripId}/apply`, { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok) { setErr(j?.error || 'Failed'); return }
      setResult(j)
    } catch (e:any) {
      setErr(e?.message || 'Network error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="card">
      <h3>AI for this trip</h3>
      <label className="block">
        <span>Describe what to add / attach docs</span>
        <textarea className="input" rows={4}
          value={prompt} onChange={e=>setPrompt(e.target.value)} />
      </label>
      <label className="block" style={{marginTop:8}}>
        <span>PDFs</span>
        <input className="input" type="file" multiple accept=".pdf" onChange={onPick} />
      </label>
      <div style={{display:'flex', gap:8, marginTop:8}}>
        <button className="btn-primary" disabled={sending} onClick={send}>
          {sending ? 'Working…' : 'Send to AI'}
        </button>
        <button className="btn" onClick={()=>{ setPrompt(''); setFiles([]); setResult(null); setErr('') }}>
          Clear
        </button>
      </div>

      {err && <div style={{color:'#b91c1c', marginTop:8}}>{err}</div>}

      {result && (
        <div className="section-card" style={{marginTop:12}}>
          <pre style={{whiteSpace:'pre-wrap'}}>
{JSON.stringify({
  created: {
    flights: result.applied?.flights?.length || 0,
    accommodations: result.applied?.accommodations?.length || 0,
    transports: result.applied?.transports?.length || 0,
    itinerary_events: result.applied?.itinerary_events?.length || 0,
  },
  errors: result.applied?.errors || [],
}, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
