'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Msg = { role: 'user' | 'assistant'; content: string }

export default function AIChat({ tripId: propTripId }: { tripId?: string }) {
  const params = useSearchParams()
  const tripId = useMemo(() => propTripId || params.get('trip') || undefined, [propTripId, params])
  const [input, setInput] = useState('')
  const [busy, setBusy]   = useState(false)
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: tripId
        ? 'Hi! I can help summarize this trip, spot gaps (missing flights, hotels, etc.), and draft itinerary items. Ask me anything about the trip.'
        : 'Hi! I’m your Trip AI. Ask me to plan a trip, draft an itinerary, or summarize costs.' }
  ])

  async function send() {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: text }])
    setBusy(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, tripId })
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      const reply = (json.reply as string) || '…'
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch (e:any) {
      setMessages(m => [...m, { role: 'assistant', content: `⚠️ ${e?.message || 'AI request failed'}` }])
    } finally {
      setBusy(false)
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send() }
  }

  return (
    <div className="section-card" style={{ padding: 12, display: 'grid', gap: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 18 }}>Trip AI Assistant</div>

      <div style={{ display: 'grid', gap: 8, maxHeight: '55vh', overflow: 'auto', paddingRight: 4 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'end' : 'start',
            justifySelf: m.role === 'user' ? 'end' : 'start',
            background: m.role === 'user' ? '#eef2ff' : '#f8fafc',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '8px 10px',
            maxWidth: 720,
            whiteSpace: 'pre-wrap'
          }}>
            {m.content}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <textarea
          className="input"
          rows={3}
          placeholder={busy ? 'Thinking…' : 'Ask something. Press ⌘/Ctrl+Enter to send.'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          disabled={busy}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <div style={{ opacity: .7, fontSize: 12 }}>
            {tripId ? `Context: trip #${tripId}` : 'No trip context (open from a trip to include context).'}
          </div>
          <button className="btn-primary" onClick={send} disabled={busy}>
            {busy ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
