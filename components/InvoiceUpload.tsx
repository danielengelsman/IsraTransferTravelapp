'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload } from 'lucide-react'

type Props = {
  tripId: string
  section: 'flight' | 'accommodation' | 'transport' | 'other'
  itemId?: string // e.g. a specific flight/accommodation/transport id
}

export default function InvoiceUpload({ tripId, section, itemId }: Props) {
  const sb = createClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [amount, setAmount] = useState<string>('')          // optional
  const [currency, setCurrency] = useState<string>('ILS')   // optional

  async function handleFile(file: File) {
    setBusy(true); setError(null); setOk(null)
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_')
      const path = `${tripId}/${section}/${itemId || 'general'}/${Date.now()}_${safeName}`

      // Upload to Storage bucket 'invoices'
      const { error: upErr } = await sb.storage.from('invoices').upload(path, file, { upsert: false })
      if (upErr) throw upErr

      // Public URL or leave null if bucket is private (signed links are generated when viewing)
      const { data } = sb.storage.from('invoices').getPublicUrl(path)
      const url = data?.publicUrl ?? null

      // Record in DB
      const payload: any = {
        trip_id: tripId,
        section,
        name: file.name,
        file_path: path,
        file_url: url,
        amount: amount ? Number(amount) : null,
        currency: amount ? currency : null
      }
      if (section === 'flight' && itemId) payload.flight_id = itemId
      if (section === 'accommodation' && itemId) payload.accommodation_id = itemId
      if (section === 'transport' && itemId) payload.transport_id = itemId

      const { error: insErr } = await sb.from('invoices').insert(payload)
      if (insErr) throw insErr

      setOk('Uploaded')
      setAmount('') // reset optional fields
      setCurrency('ILS')
    } catch (err: any) {
      setError(err?.message || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="block">
        <span className="label">Amount</span>
        <input
          className="input"
          type="number"
          step="0.01"
          placeholder="e.g. 350"
          value={amount}
          onChange={(e)=>setAmount(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="label">Currency</span>
        <select className="input" value={currency} onChange={(e)=>setCurrency(e.target.value)}>
          <option>ILS</option>
          <option>USD</option>
          <option>EUR</option>
          <option>GBP</option>
        </select>
      </label>

      <label className="inline-flex items-center gap-2 text-sm">
        <span className="btn"><Upload size={14}/> Upload invoice</span>
        <input
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          disabled={busy}
          onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleFile(f); e.currentTarget.value='' }}
        />
      </label>

      {busy && <span>Uploading…</span>}
      {ok && <span className="text-green-700">{ok}</span>}
      {error && <span className="text-red-600">{error}</span>}
    </div>
  )
}
