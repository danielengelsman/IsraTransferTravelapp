'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setError(null); setOk(null)
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_')
      const path = `${tripId}/${section}/${itemId || 'general'}/${Date.now()}_${safeName}`

      // Upload to Storage bucket 'invoices'
      const { error: upErr } = await sb.storage.from('invoices').upload(path, file, { upsert: false })
      if (upErr) throw upErr

      // Get a public URL (bucket is public for now)
      const { data } = sb.storage.from('invoices').getPublicUrl(path)
      const url = data.publicUrl

      // Record in invoices table
      const payload: any = {
        trip_id: tripId,
        section,
        file_path: path,
        file_url: url
      }
      if (section === 'flight' && itemId) payload.flight_id = itemId
      if (section === 'accommodation' && itemId) payload.accommodation_id = itemId
      if (section === 'transport' && itemId) payload.transport_id = itemId

      const { error: insErr } = await sb.from('invoices').insert(payload)
      if (insErr) throw insErr

      setOk('Uploaded')
    } catch (err: any) {
      setError(err?.message || 'Upload failed')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="btn">Upload invoice</span>
      <input type="file" accept="image/*,.pdf" onChange={onChange} className="hidden" disabled={busy} />
      {busy && <span>Uploading…</span>}
      {ok && <span className="text-green-700">{ok}</span>}
      {error && <span className="text-red-600">{error}</span>}
    </label>
  )
}
