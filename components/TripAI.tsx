'use client'
import { useState } from 'react'

export default function TripAI({ tripId }: { tripId: string }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<
    { role: 'user'|'assistant', content: string }[]
  >([])

  async function send() {
    if (!input.trim()) return
    const text = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', content: text }])
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, message: text })
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.reply || 'OK' }])
    } catch (e:any) {
      setMessages(m => [...m, { role: 'assistant', content: e?.message || 'Error' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="section-card" style={{display:'grid', gap:8}}>
      <div style={{fontWeight:700}}>Trip AI Assistant</div>
      <div style={{maxHeight:240, overflow:'auto', padding:8, border:'1px solid #eee', borderRadius:8}}>
        {messages.length === 0 ? (
          <div style={{opacity:.8, fontSize:13}}>
            Try: “Add BA flight TLV→LHR on Oct 12 (see attached PDF)” or “Create hotel Marriott 12–16 Oct, £180/night”.
          </div>
        ) : messages.map((m, i) => (
          <div key={i} style={{margin:'6px 0'}}>
            <b>{m.role === 'user' ? 'You' : 'Assistant'}:</b> {m.content}
          </div>
        ))}
      </div>
      <div style={{display:'flex', gap:8}}>
        <input
          className="input"
          placeholder="Ask the assistant…"
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter') send() }}
        />
        <button className="btn-primary" onClick={send} disabled={loading}>
          {loading ? 'Thinking…' : 'Send'}
        </button>
      </div>
      <div style={{fontSize:12, opacity:.8}}>
        The assistant creates “AI Suggestions” you can accept or reject.
      </div>
    </div>
  )
}
