'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Invoice = {
  id: string
  name: string
  mime_type: string | null
  size: number | null
  file_path: string
  uploaded_at: string
}

export default function InvoiceUploader({ tripId, existing }: { tripId: string, existing: Invoice[] }) {
  const sb = createClient()
  const [invoices, setInvoices] = useState<Invoice[]>(existing || [])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function refreshUrls(list: Invoice[]) {
    const next: Record<string, string> = {}
    for (const inv of list) {
      const { data } = await sb.storage.from('invoices').createSignedUrl(inv.file_path, 60 * 10) // 10 min
      if (data?.signedUrl) next[inv.id] = data.signedUrl
    }
    setUrls(next)
  }

  useEffect(() => { refreshUrls(invoices) }, [])

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setBusy(true)
    try {
      for (const f of Array.from(files)) {
        const key = `${tripId}/${Date.now()}-${f.name}`
        const up = await sb.storage.from('invoices').upload(key, f, { upsert: false })
        if (up.error) throw up.error
        const { data: row, error } = await sb.from('invoices').insert({
          trip_id: tripId,
          name: f.name,
          mime_type: f.type || null,
          size: f.size,
          file_path: key,
        }).select('*').single()
        if (error) throw error
        setInvoices((prev) => [row as any, ...prev])
      }
      await refreshUrls(invoices)
    } catch (e: any) {
      alert(e.message || 'Upload error')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  async function remove(inv: Invoice) {
    if (!confirm('Delete this invoice?')) return
    await sb.storage.from('invoices').remove([inv.file_path])
    await sb.from('invoices').delete().eq('id', inv.id)
    const next = invoices.filter(i => i.id !== inv.id)
    setInvoices(next)
    await refreshUrls(next)
  }

  return (
    <div className="space-y-3">
      <label className="btn">
        <input type="file" multiple onChange={onFiles} className="hidden" />
        Upload invoices
      </label>
      {busy && <div className="text-sm text-gray-600">Uploading…</div>}
      <div className="grid md:grid-cols-2 gap-3">
        {invoices.map(inv => (
          <div key={inv.id} className="border rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{inv.name}</div>
                <div className="text-xs text-gray-600">{inv.mime_type || 'unknown'} • {(inv.size ?? 0)/1024|0} KB • {new Date(inv.uploaded_at).toLocaleString()}</div>
              </div>
              <button className="btn" onClick={()=> remove(inv)}>Delete</button>
            </div>
            {urls[inv.id] && (
              <div className="mt-2">
                <a className="link" href={urls[inv.id]} target="_blank">Preview</a>
              </div>
            )}
          </div>
        ))}
        {!invoices.length && <div className="text-sm text-gray-600">No invoices yet.</div>}
      </div>
    </div>
  )
}
