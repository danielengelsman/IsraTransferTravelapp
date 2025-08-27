'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import InvoiceUpload from '@/components/InvoiceUpload'

type Trip = {
  id: string
  title: string | null
  description: string | null
  location: string | null
  start_date: string | null
  end_date: string | null
}
type Flight = {
  id: string
  trip_id: string
  flight_type: 'international' | 'internal' | null
  carrier: string | null
  flight_number: string | null
  depart_airport: string | null
  arrive_airport: string | null
  depart_time: string | null
  arrive_time: string | null
  notes: string | null
}
type Accommodation = {
  id: string
  trip_id: string
  name: string | null
  address: string | null
  check_in: string | null
  check_out: string | null
  booking_ref: string | null
  notes: string | null
}
type Transport = {
  id: string
  trip_id: string
  type: 'car_hire' | 'toll' | 'train' | 'taxi' | 'other' | null
  company: string | null
  pickup_location: string | null
  dropoff_location: string | null
  start_time: string | null
  end_time: string | null
  cost: number | null
  notes: string | null
}
type Invoice = {
  id: string
  trip_id: string
  section: string | null
  file_url: string | null
  flight_id?: string | null
  accommodation_id?: string | null
  transport_id?: string | null
}

export default function TripDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id?.toString()
  const sb = useMemo(() => createClient(), [])

  const [status, setStatus] = useState<'loading' | 'need-login' | 'ready' | 'not-found' | 'error'>('loading')
  const [msg, setMsg] = useState('')

  const [trip, setTrip] = useState<Trip | null>(null)
  const [flights, setFlights] = useState<Flight[]>([])
  const [accs, setAccs] = useState<Accommodation[]>([])
  const [trans, setTrans] = useState<Transport[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])

  // Add forms show/hide
  const [showFlightForm, setShowFlightForm] = useState(false)
  const [showAccForm, setShowAccForm] = useState(false)
  const [showTransForm, setShowTransForm] = useState(false)

  // Add forms state
  const [desc, setDesc] = useState('')
  const [fType, setFType] = useState<'international' | 'internal'>('international')
  const [carrier, setCarrier] = useState(''); const [fno, setFno] = useState('')
  const [depA, setDepA] = useState(''); const [arrA, setArrA] = useState('')
  const [depT, setDepT] = useState(''); const [arrT, setArrT] = useState('')
  const [flightInvoice, setFlightInvoice] = useState<File | null>(null)

  const [accName, setAccName] = useState(''); const [accAddr, setAccAddr] = useState('')
  const [accIn, setAccIn] = useState(''); const [accOut, setAccOut] = useState(''); const [accRef, setAccRef] = useState('')
  const [accInvoice, setAccInvoice] = useState<File | null>(null)

  const [tType, setTType] = useState<'car_hire'|'toll'|'train'|'taxi'|'other'>('car_hire')
  const [tCompany, setTCompany] = useState(''); const [tFrom, setTFrom] = useState(''); const [tTo, setTTo] = useState('')
  const [tStart, setTStart] = useState(''); const [tEnd, setTEnd] = useState(''); const [tCost, setTCost] = useState('')
  const [tInvoice, setTInvoice] = useState<File | null>(null)

  // EDIT panels (which item is open)
  const [editFlightId, setEditFlightId] = useState<string | null>(null)
  const [editAccId, setEditAccId] = useState<string | null>(null)
  const [editTransId, setEditTransId] = useState<string | null>(null)

  // EDIT state for current item
  const [eFType, setEFType] = useState<'international' | 'internal'>('international')
  const [eCarrier, setECarrier] = useState(''); const [eFno, setEFno] = useState('')
  const [eDepA, setEDepA] = useState(''); const [eArrA, setEArrA] = useState('')
  const [eDepT, setEDepT] = useState(''); const [eArrT, setEArrT] = useState('')

  const [eAccName, setEAccName] = useState(''); const [eAccAddr, setEAccAddr] = useState('')
  const [eAccIn, setEAccIn] = useState(''); const [eAccOut, setEAccOut] = useState(''); const [eAccRef, setEAccRef] = useState('')

  const [eTType, setETType] = useState<'car_hire'|'toll'|'train'|'taxi'|'other'>('car_hire')
  const [eTCompany, setETCompany] = useState(''); const [eTFrom, setETFrom] = useState(''); const [eTTo, setETTo] = useState('')
  const [eTStart, setETStart] = useState(''); const [eTEnd, setETEnd] = useState(''); const [eTCost, setETCost] = useState('')

  async function reloadAll() {
    if (!id) return
    const { data: t, error: e1 } = await sb.from('trips').select('*').eq('id', id).single()
    if (e1) { setMsg(e1.message); setStatus('error'); return }
    if (!t) { setStatus('not-found'); return }
    setTrip(t as Trip)
    setDesc((t as Trip).description || '')

    const [fl, ac, tr, inv] = await Promise.all([
      sb.from('flights').select('*').eq('trip_id', id).order('depart_time', { ascending: true }),
      sb.from('accommodations').select('*').eq('trip_id', id).order('check_in', { ascending: true }),
      sb.from('transports').select('*').eq('trip_id', id).order('start_time', { ascending: true }),
      sb.from('invoices').select('*').eq('trip_id', id).order('uploaded_at', { ascending: false })
    ])
    if (fl.error || ac.error || tr.error || inv.error) {
      setMsg(fl.error?.message || ac.error?.message || tr.error?.message || inv.error?.message || 'Failed to load')
      setStatus('error'); return
    }
    setFlights(fl.data as any || [])
    setAccs(ac.data as any || [])
    setTrans(tr.data as any || [])
    setInvoices(inv.data as any || [])
    setStatus('ready')
  }

  // Helpers
  const toInputDT = (s: string | null) => s ? new Date(s).toISOString().slice(0,16) : ''
  function invFor(kind: 'flight'|'accommodation'|'transport', id: string) {
    return invoices.filter((i) => i.section === kind && (i as any)[`${kind}_id`] === id)
  }
  async function uploadInvoice(section: 'flight'|'accommodation'|'transport', itemId: string, file: File) {
    const safe = file.name.replace(/[^\w.\-]+/g, '_')
    const path = `${id}/${section}/${itemId}/${Date.now()}_${safe}`
    const { error: upErr } = await sb.storage.from('invoices').upload(path, file, { upsert: false })
    if (upErr) throw upErr
    const { data } = sb.storage.from('invoices').getPublicUrl(path)
    const url = data.publicUrl
    const payload: any = { trip_id: id, section, name: file.name, file_path: path, file_url: url }
    if (section === 'flight') payload.flight_id = itemId
    if (section === 'accommodation') payload.accommodation_id = itemId
    if (section === 'transport') payload.transport_id = itemId
    const { error: insErr } = await sb.from('invoices').insert(payload)
    if (insErr) throw insErr
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { if (!cancelled) setStatus('need-login'); return }
      if (!cancelled) await reloadAll()
    })()
    return () => { cancelled = true }
  }, [id, sb])

  if (status === 'loading') return <div className="card">Loading…</div>
  if (status === 'need-login') return (
    <div className="card">
      <div className="mb-2">You’re not logged in.</div>
      <Link className="btn-primary" href="/login?next=/trips">Go to Login</Link>
    </div>
  )
  if (status === 'not-found') return (
    <div className="card">
      <div className="mb-2">Trip not found.</div>
      <Link className="btn" href="/trips">Back to Trips</Link>
    </div>
  )
  if (status === 'error') return <div className="card text-red-600">{msg}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{trip?.title || 'Untitled trip'}</h1>
        <Link className="btn" href="/trips">Back to Trips</Link>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-gray-600">Location</div>
          <div className="text-lg">{trip?.location || '—'}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Dates</div>
          <div className="text-lg">{trip?.start_date || '—'} → {trip?.end_date || '—'}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Trip ID</div>
          <div className="font-mono text-sm">{trip?.id}</div>
        </div>
      </div>

      {/* Description */}
      <div className="card space-y-2">
        <div className="text-sm text-gray-600">Description</div>
        <textarea className="input" rows={3} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What is this trip about?" />
        <button
          className="btn-primary"
          onClick={async () => {
            const { error } = await sb.from('trips').update({ description: desc }).eq('id', id!)
            if (error) { alert(error.message); return }
            alert('Saved')
          }}
        >Save description</button>
      </div>

      {/* Flights */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold">Flights</div>
          <button className="btn" onClick={() => setShowFlightForm(s => !s)}>
            {showFlightForm ? 'Cancel' : 'Add flight'}
          </button>
        </div>
        {showFlightForm && (
          <div className="card grid md:grid-cols-2 gap-3">
            <label className="block"><span className="label">Type</span>
              <select className="input" value={fType} onChange={e=>setFType(e.target.value as any)}>
                <option value="international">International</option>
                <option value="internal">Internal</option>
              </select></label>
            <label className="block"><span className="label">Carrier</span>
              <input className="input" value={carrier} onChange={e=>setCarrier(e.target.value)} /></label>
            <label className="block"><span className="label">Flight #</span>
              <input className="input" value={fno} onChange={e=>setFno(e.target.value)} /></label>
            <label className="block"><span className="label">Depart airport</span>
              <input className="input" value={depA} onChange={e=>setDepA(e.target.value)} /></label>
            <label className="block"><span className="label">Arrive airport</span>
              <input className="input" value={arrA} onChange={e=>setArrA(e.target.value)} /></label>
            <label className="block"><span className="label">Depart time</span>
              <input className="input" type="datetime-local" value={depT} onChange={e=>setDepT(e.target.value)} /></label>
            <label className="block"><span className="label">Arrive time</span>
              <input className="input" type="datetime-local" value={arrT} onChange={e=>setArrT(e.target.value)} /></label>
            <label className="block md:col-span-2"><span className="label">Invoice (optional)</span>
              <input className="input" type="file" accept="image/*,.pdf" onChange={e=>setFlightInvoice(e.target.files?.[0] || null)} /></label>
            <div className="flex items-end">
              <button className="btn-primary" onClick={async ()=>{
                const { data, error } = await sb.from('flights').insert({
                  trip_id: id, flight_type: fType, carrier, flight_number: fno,
                  depart_airport: depA, arrive_airport: arrA,
                  depart_time: depT ? new Date(depT).toISOString() : null,
                  arrive_time: arrT ? new Date(arrT).toISOString() : null
                }).select().single()
                if (error) { alert(error.message); return }
                if (data?.id && flightInvoice) {
                  try { await uploadInvoice('flight', data.id as string, flightInvoice) }
                  catch (e:any) { alert('Flight saved, but invoice upload failed: ' + (e?.message||'unknown')) }
                }
                setCarrier(''); setFno(''); setDepA(''); setArrA(''); setDepT(''); setArrT(''); setFlightInvoice(null)
                setShowFlightForm(false); await reloadAll()
              }}>Add flight</button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          {flights.map(f => (
            <div key={f.id} className="card space-y-2">
              <div className="flex justify-between items-center">
                <div className="font-medium">{(f.flight_type || '—').toUpperCase()} • {f.carrier || ''} {f.flight_number || ''}</div>
                <div className="flex gap-2">
                  <InvoiceUpload tripId={id!} section="flight" itemId={f.id} />
                  <button className="btn" onClick={()=>{
                    setEditFlightId(f.id)
                    setEFType((f.flight_type as any)||'international')
                    setECarrier(f.carrier||''); setEFno(f.flight_number||'')
                    setEDepA(f.depart_airport||''); setEArrA(f.arrive_airport||'')
                    setEDepT(toInputDT(f.depart_time)); setEArrT(toInputDT(f.arrive_time))
                  }}>Edit</button>
                </div>
              </div>
              <div className="text-sm text-gray-600">{f.depart_airport || '—'} → {f.arrive_airport || '—'}</div>
              <div className="text-sm">{f.depart_time || '—'} → {f.arrive_time || '—'}</div>

              {/* EDIT PANEL */}
              {editFlightId === f.id && (
                <div className="mt-2 border-t pt-2 grid md:grid-cols-2 gap-3">
                  <label className="block"><span className="label">Type</span>
                    <select className="input" value={eFType} onChange={e=>setEFType(e.target.value as any)}>
                      <option value="international">International</option>
                      <option value="internal">Internal</option>
                    </select></label>
                  <label className="block"><span className="label">Carrier</span>
                    <input className="input" value={eCarrier} onChange={e=>setECarrier(e.target.value)} /></label>
                  <label className="block"><span className="label">Flight #</span>
                    <input className="input" value={eFno} onChange={e=>setEFno(e.target.value)} /></label>
                  <label className="block"><span className="label">Depart airport</span>
                    <input className="input" value={eDepA} onChange={e=>setEDepA(e.target.value)} /></label>
                  <label className="block"><span className="label">Arrive airport</span>
                    <input className="input" value={eArrA} onChange={e=>setEArrA(e.target.value)} /></label>
                  <label className="block"><span className="label">Depart time</span>
                    <input className="input" type="datetime-local" value={eDepT} onChange={e=>setEDepT(e.target.value)} /></label>
                  <label className="block"><span className="label">Arrive time</span>
                    <input className="input" type="datetime-local" value={eArrT} onChange={e=>setEArrT(e.target.value)} /></label>

                  <div className="md:col-span-2 flex items-center gap-3">
                    <button className="btn-primary" onClick={async ()=>{
                      const { error } = await sb.from('flights').update({
                        flight_type: eFType, carrier: eCarrier, flight_number: eFno,
                        depart_airport: eDepA, arrive_airport: eArrA,
                        depart_time: eDepT ? new Date(eDepT).toISOString() : null,
                        arrive_time: eArrT ? new Date(eArrT).toISOString() : null
                      }).eq('id', f.id)
                      if (error) { alert(error.message); return }
                      setEditFlightId(null); await reloadAll()
                    }}>Save</button>
                    <button className="btn" onClick={()=>setEditFlightId(null)}>Cancel</button>
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-600 mb-1">Invoices</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <InvoiceUpload tripId={id!} section="flight" itemId={f.id} />
                      {invFor('flight', f.id).map(i => (
                        <a key={i.id} href={i.file_url || '#'} target="_blank" className="underline text-sm">view</a>
                      ))}
                      {!invFor('flight', f.id).length && <span className="text-sm">No invoices yet.</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!flights.length && <div className="card">No flights yet.</div>}
        </div>
      </div>

      {/* Accommodation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold">Accommodation</div>
          <button className="btn" onClick={() => setShowAccForm(s => !s)}>
            {showAccForm ? 'Cancel' : 'Add accommodation'}
          </button>
        </div>
        {showAccForm && (
          <div className="card grid md:grid-cols-2 gap-3">
            <label className="block"><span className="label">Name</span>
              <input className="input" value={accName} onChange={e=>setAccName(e.target.value)} /></label>
            <label className="block"><span className="label">Address</span>
              <input className="input" value={accAddr} onChange={e=>setAccAddr(e.target.value)} /></label>
            <label className="block"><span className="label">Check-in</span>
              <input className="input" type="date" value={accIn} onChange={e=>setAccIn(e.target.value)} /></label>
            <label className="block"><span className="label">Check-out</span>
              <input className="input" type="date" value={accOut} onChange={e=>setAccOut(e.target.value)} /></label>
            <label className="block"><span className="label">Booking ref</span>
              <input className="input" value={accRef} onChange={e=>setAccRef(e.target.value)} /></label>
            <label className="block md:col-span-2"><span className="label">Invoice (optional)</span>
              <input className="input" type="file" accept="image/*,.pdf" onChange={e=>setAccInvoice(e.target.files?.[0] || null)} /></label>
            <div className="flex items-end">
              <button className="btn-primary" onClick={async ()=>{
                const { data, error } = await sb.from('accommodations').insert({
                  trip_id: id, name: accName, address: accAddr,
                  check_in: accIn || null, check_out: accOut || null, booking_ref: accRef || null
                }).select().single()
                if (error) { alert(error.message); return }
                if (data?.id && accInvoice) {
                  try { await uploadInvoice('accommodation', data.id as string, accInvoice) }
                  catch (e:any) { alert('Accommodation saved, but invoice upload failed: ' + (e?.message||'unknown')) }
                }
                setAccName(''); setAccAddr(''); setAccIn(''); setAccOut(''); setAccRef(''); setAccInvoice(null)
                setShowAccForm(false); await reloadAll()
              }}>Add accommodation</button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          {accs.map(a => (
            <div key={a.id} className="card space-y-2">
              <div className="flex justify-between items-center">
                <div className="font-medium">{a.name || '—'}</div>
                <div className="flex gap-2">
                  <InvoiceUpload tripId={id!} section="accommodation" itemId={a.id} />
                  <button className="btn" onClick={()=>{
                    setEditAccId(a.id)
                    setEAccName(a.name||''); setEAccAddr(a.address||'')
                    setEAccIn(a.check_in||''); setEAccOut(a.check_out||''); setEAccRef(a.booking_ref||'')
                  }}>Edit</button>
                </div>
              </div>
              <div className="text-sm text-gray-600">{a.address || '—'}</div>
              <div className="text-sm">{a.check_in || '—'} → {a.check_out || '—'}</div>

              {editAccId === a.id && (
                <div className="mt-2 border-t pt-2 grid md:grid-cols-2 gap-3">
                  <label className="block"><span className="label">Name</span>
                    <input className="input" value={eAccName} onChange={e=>setEAccName(e.target.value)} /></label>
                  <label className="block"><span className="label">Address</span>
                    <input className="input" value={eAccAddr} onChange={e=>setEAccAddr(e.target.value)} /></label>
                  <label className="block"><span className="label">Check-in</span>
                    <input className="input" type="date" value={eAccIn} onChange={e=>setEAccIn(e.target.value)} /></label>
                  <label className="block"><span className="label">Check-out</span>
                    <input className="input" type="date" value={eAccOut} onChange={e=>setEAccOut(e.target.value)} /></label>
                  <label className="block"><span className="label">Booking ref</span>
                    <input className="input" value={eAccRef} onChange={e=>setEAccRef(e.target.value)} /></label>

                  <div className="md:col-span-2 flex items-center gap-3">
                    <button className="btn-primary" onClick={async ()=>{
                      const { error } = await sb.from('accommodations').update({
                        name: eAccName, address: eAccAddr,
                        check_in: eAccIn || null, check_out: eAccOut || null, booking_ref: eAccRef || null
                      }).eq('id', a.id)
                      if (error) { alert(error.message); return }
                      setEditAccId(null); await reloadAll()
                    }}>Save</button>
                    <button className="btn" onClick={()=>setEditAccId(null)}>Cancel</button>
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-600 mb-1">Invoices</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <InvoiceUpload tripId={id!} section="accommodation" itemId={a.id} />
                      {invFor('accommodation', a.id).map(i => (
                        <a key={i.id} href={i.file_url || '#'} target="_blank" className="underline text-sm">view</a>
                      ))}
                      {!invFor('accommodation', a.id).length && <span className="text-sm">No invoices yet.</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!accs.length && <div className="card">No accommodation yet.</div>}
        </div>
      </div>

      {/* Transportation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold">Transportation</div>
          <button className="btn" onClick={() => setShowTransForm(s => !s)}>
            {showTransForm ? 'Cancel' : 'Add transportation'}
          </button>
        </div>
        {showTransForm && (
          <div className="card grid md:grid-cols-2 gap-3">
            <label className="block"><span className="label">Type</span>
              <select className="input" value={tType} onChange={e=>setTType(e.target.value as any)}>
                <option value="car_hire">Car hire</option>
                <option value="toll">Toll</option>
                <option value="train">Train</option>
                <option value="taxi">Taxi</option>
                <option value="other">Other</option>
              </select></label>
            <label className="block"><span className="label">Company</span>
              <input className="input" value={tCompany} onChange={e=>setTCompany(e.target.value)} /></label>
            <label className="block"><span className="label">Pickup</span>
              <input className="input" value={tFrom} onChange={e=>setTFrom(e.target.value)} /></label>
            <label className="block"><span className="label">Dropoff</span>
              <input className="input" value={tTo} onChange={e=>setTTo(e.target.value)} /></label>
            <label className="block"><span className="label">Start time</span>
              <input className="input" type="datetime-local" value={tStart} onChange={e=>setTStart(e.target.value)} /></label>
            <label className="block"><span className="label">End time</span>
              <input className="input" type="datetime-local" value={tEnd} onChange={e=>setTEnd(e.target.value)} /></label>
            <label className="block"><span className="label">Cost</span>
              <input className="input" type="number" step="0.01" value={tCost} onChange={e=>setTCost(e.target.value)} /></label>
            <label className="block md:col-span-2"><span className="label">Invoice (optional)</span>
              <input className="input" type="file" accept="image/*,.pdf" onChange={e=>setTInvoice(e.target.files?.[0] || null)} /></label>
            <div className="flex items-end">
              <button className="btn-primary" onClick={async ()=>{
                const { data, error } = await sb.from('transports').insert({
                  trip_id: id, type: tType, company: tCompany || null,
                  pickup_location: tFrom || null, dropoff_location: tTo || null,
                  start_time: tStart ? new Date(tStart).toISOString() : null,
                  end_time: tEnd ? new Date(tEnd).toISOString() : null,
                  cost: tCost ? Number(tCost) : null
                }).select().single()
                if (error) { alert(error.message); return }
                if (data?.id && tInvoice) {
                  try { await uploadInvoice('transport', data.id as string, tInvoice) }
                  catch (e:any) { alert('Transportation saved, but invoice upload failed: ' + (e?.message||'unknown')) }
                }
                setTCompany(''); setTFrom(''); setTTo(''); setTStart(''); setTEnd(''); setTCost(''); setTInvoice(null)
                setShowTransForm(false); await reloadAll()
              }}>Add transportation</button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          {trans.map(t => (
            <div key={t.id} className="card space-y-2">
              <div className="flex justify-between items-center">
                <div className="font-medium">{t.type || '—'} {t.company ? `• ${t.company}` : ''}</div>
                <div className="flex gap-2">
                  <InvoiceUpload tripId={id!} section="transport" itemId={t.id} />
                  <button className="btn" onClick={()=>{
                    setEditTransId(t.id)
                    setETType((t.type as any)||'car_hire'); setETCompany(t.company||'')
                    setETFrom(t.pickup_location||''); setETTo(t.dropoff_location||'')
                    setETStart(toInputDT(t.start_time)); setETEnd(toInputDT(t.end_time)); setETCost(t.cost?.toString()||'')
                  }}>Edit</button>
                </div>
              </div>
              <div className="text-sm text-gray-600">{t.pickup_location || '—'} → {t.dropoff_location || '—'}</div>
              <div className="text-sm">{t.start_time || '—'} → {t.end_time || '—'}</div>

              {editTransId === t.id && (
                <div className="mt-2 border-t pt-2 grid md:grid-cols-2 gap-3">
                  <label className="block"><span className="label">Type</span>
                    <select className="input" value={eTType} onChange={e=>setETType(e.target.value as any)}>
                      <option value="car_hire">Car hire</option>
                      <option value="toll">Toll</option>
                      <option value="train">Train</option>
                      <option value="taxi">Taxi</option>
                      <option value="other">Other</option>
                    </select></label>
                  <label className="block"><span className="label">Company</span>
                    <input className="input" value={eTCompany} onChange={e=>setETCompany(e.target.value)} /></label>
                  <label className="block"><span className="label">Pickup</span>
                    <input className="input" value={eTFrom} onChange={e=>setETFrom(e.target.value)} /></label>
                  <label className="block"><span className="label">Dropoff</span>
                    <input className="input" value={eTTo} onChange={e=>setETTo(e.target.value)} /></label>
                  <label className="block"><span className="label">Start time</span>
                    <input className="input" type="datetime-local" value={eTStart} onChange={e=>setETStart(e.target.value)} /></label>
                  <label className="block"><span className="label">End time</span>
                    <input className="input" type="datetime-local" value={eTEnd} onChange={e=>setETEnd(e.target.value)} /></label>
                  <label className="block"><span className="label">Cost</span>
                    <input className="input" type="number" step="0.01" value={eTCost} onChange={e=>setETCost(e.target.value)} /></label>

                  <div className="md:col-span-2 flex items-center gap-3">
                    <button className="btn-primary" onClick={async ()=>{
                      const { error } = await sb.from('transports').update({
                        type: eTType, company: eTCompany || null,
                        pickup_location: eTFrom || null, dropoff_location: eTTo || null,
                        start_time: eTStart ? new Date(eTStart).toISOString() : null,
                        end_time: eTEnd ? new Date(eTEnd).toISOString() : null,
                        cost: eTCost ? Number(eTCost) : null
                      }).eq('id', t.id)
                      if (error) { alert(error.message); return }
                      setEditTransId(null); await reloadAll()
                    }}>Save</button>
                    <button className="btn" onClick={()=>setEditTransId(null)}>Cancel</button>
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-600 mb-1">Invoices</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <InvoiceUpload tripId={id!} section="transport" itemId={t.id} />
                      {invFor('transport', t.id).map(i => (
                        <a key={i.id} href={i.file_url || '#'} target="_blank" className="underline text-sm">view</a>
                      ))}
                      {!invFor('transport', t.id).length && <span className="text-sm">No invoices yet.</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!trans.length && <div className="card">No transportation yet.</div>}
        </div>
      </div>
    </div>
  )
}
