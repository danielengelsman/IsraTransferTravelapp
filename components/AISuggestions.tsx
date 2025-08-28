'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Proposal = {
  id: string
  trip_id: string
  kind: 'flight'|'accommodation'|'transport'|'event'
  payload: any
  status: 'pending'|'applied'|'rejected'
  created_at: string
}

export default function AISuggestions({ tripId, onApplied }:{ tripId:string, onApplied?:()=>void }) {
  const sb = createClient()  // client-side auth
  const [items, setItems] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data, error } = await sb
      .from('ai_proposals')
      .select('*')
      .eq('trip_id', tripId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (!error) setItems((data||[]) as Proposal[])
    setLoading(false)
  }

  useEffect(()=>{ load() }, [tripId])

  async function apply(id:string) {
    const res = await fetch(`/api/ai/proposals/${id}/apply`, { method: 'POST' })
    const body = await res.json()
    if (!res.ok) { alert(body.error || 'Failed'); return }
    await load()
    onApplied?.()
  }

  async function reject(id:string) {
    const res = await fetch(`/api/ai/proposals/${id}/reject`, { method: 'POST' })
    const body = await res.json()
    if (!res.ok) { alert(body.error || 'Failed'); return }
    await load()
  }

  return (
    <div className="section-card" style={{display:'grid', gap:8}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div style={{fontWeight:700}}>AI Suggestions</div>
        <button className="btn" onClick={load}>Refresh</button>
      </div>
      {loading ? <div>Loading…</div> : items.length === 0 ? (
        <div className="row-sub">No pending suggestions.</div>
      ) : items.map(p => (
        <div key={p.id} className="card" style={{padding:12}}>
          <div style={{fontWeight:700, marginBottom:6}}>{p.kind.toUpperCase()}</div>
          <pre style={{whiteSpace:'pre-wrap', fontSize:12, background:'#fafafa', padding:8, borderRadius:6}}>
{JSON.stringify(p.payload, null, 2)}
          </pre>
          <div style={{display:'flex', gap:8}}>
            <button className="btn-primary" onClick={()=>apply(p.id)}>Apply</button>
            <button className="btn" onClick={()=>reject(p.id)}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  )
}
