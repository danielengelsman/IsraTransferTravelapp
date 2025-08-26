import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TripForm from '@/components/TripForm'
import InvoiceUploader from '@/components/InvoiceUploader'

export default async function TripDetail({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/trips/${params.id}`)

  const { data: trip } = await supabase.from('trips').select('*').eq('id', params.id).single()
  const { data: flights } = await supabase.from('flights').select('*').eq('trip_id', params.id).order('depart_time', { ascending: true })
  const { data: hotel } = await supabase.from('hotels').select('*').eq('trip_id', params.id).maybeSingle()
  const { data: car } = await supabase.from('car_hires').select('*').eq('trip_id', params.id).maybeSingle()
  const { data: invoices } = await supabase.from('invoices').select('*').eq('trip_id', params.id).order('uploaded_at', { ascending: false })

  async function saveTrip(formData: FormData) {
    'use server'
    const supabase = createClient()
    const payload = {
      title: String(formData.get('title') || ''),
      location: String(formData.get('location') || ''),
      start_date: String(formData.get('start_date') || ''),
      end_date: String(formData.get('end_date') || ''),
      description: String(formData.get('description') || ''),
    }
    await supabase.from('trips').update(payload).eq('id', params.id)
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-semibold mb-2">Trip</h1>
        <TripForm action={saveTrip} initial={trip} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-2">Hotel</h2>
          <HotelForm tripId={params.id} initial={hotel || null} />
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold mb-2">Car Hire</h2>
          <CarForm tripId={params.id} initial={car || null} />
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-2">Flights</h2>
        <FlightsList tripId={params.id} flights={flights || []} />
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-2">Invoices</h2>
        <InvoiceUploader tripId={params.id} existing={invoices || []} />
      </div>
    </div>
  )
}

function Section({ children }: { children: React.ReactNode }) { return <div className="space-y-3">{children}</div> }

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return <label className="block">
    <span className="label">{label}</span>
    {children}
  </label>
}

// Client components below
'use client'
import { useState } from 'react'
import { createClient as createClientBrowser } from '@/lib/supabase/client'

function useSB() { return createClientBrowser() }

export function HotelForm({ tripId, initial }: { tripId: string, initial: any | null }) {
  const sb = useSB()
  const [payload, setPayload] = useState(initial ?? { trip_id: tripId, name: '', address: '', check_in: '', check_out: '', confirmation: '', notes: '' })
  async function save() {
    if (initial) {
      await sb.from('hotels').upsert({ ...payload, trip_id: tripId }).eq('trip_id', tripId)
    } else {
      await sb.from('hotels').insert({ ...payload, trip_id: tripId })
    }
  }
  return (
    <Section>
      <Field label="Hotel name"><input className="input" value={payload.name} onChange={e=> setPayload({ ...payload, name: e.target.value })} /></Field>
      <Field label="Address"><input className="input" value={payload.address} onChange={e=> setPayload({ ...payload, address: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Check-in"><input type="datetime-local" className="input" value={payload.check_in || ''} onChange={e=> setPayload({ ...payload, check_in: e.target.value })} /></Field>
        <Field label="Check-out"><input type="datetime-local" className="input" value={payload.check_out || ''} onChange={e=> setPayload({ ...payload, check_out: e.target.value })} /></Field>
      </div>
      <Field label="Confirmation"><input className="input" value={payload.confirmation} onChange={e=> setPayload({ ...payload, confirmation: e.target.value })} /></Field>
      <Field label="Notes"><textarea className="input" rows={3} value={payload.notes} onChange={e=> setPayload({ ...payload, notes: e.target.value })} /></Field>
      <button className="btn-primary" onClick={save}>Save hotel</button>
    </Section>
  )
}

export function CarForm({ tripId, initial }: { tripId: string, initial: any | null }) {
  const sb = useSB()
  const [payload, setPayload] = useState(initial ?? { trip_id: tripId, company: '', pickup_location: '', pickup_date: '', dropoff_date: '', confirmation: '', notes: '' })
  async function save() {
    if (initial) {
      await sb.from('car_hires').upsert({ ...payload, trip_id: tripId }).eq('trip_id', tripId)
    } else {
      await sb.from('car_hires').insert({ ...payload, trip_id: tripId })
    }
  }
  return (
    <Section>
      <Field label="Company"><input className="input" value={payload.company} onChange={e=> setPayload({ ...payload, company: e.target.value })} /></Field>
      <Field label="Pickup location"><input className="input" value={payload.pickup_location} onChange={e=> setPayload({ ...payload, pickup_location: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pickup date"><input type="datetime-local" className="input" value={payload.pickup_date || ''} onChange={e=> setPayload({ ...payload, pickup_date: e.target.value })} /></Field>
        <Field label="Drop-off date"><input type="datetime-local" className="input" value={payload.dropoff_date || ''} onChange={e=> setPayload({ ...payload, dropoff_date: e.target.value })} /></Field>
      </div>
      <Field label="Confirmation"><input className="input" value={payload.confirmation} onChange={e=> setPayload({ ...payload, confirmation: e.target.value })} /></Field>
      <Field label="Notes"><textarea className="input" rows={3} value={payload.notes} onChange={e=> setPayload({ ...payload, notes: e.target.value })} /></Field>
      <button className="btn-primary" onClick={save}>Save car hire</button>
    </Section>
  )
}

export function FlightsList({ tripId, flights }: { tripId: string, flights: any[] }) {
  const sb = useSB()
  const [items, setItems] = useState(flights)

  function blank() {
    return { trip_id: tripId, type: 'International', airline: '', flight_number: '', depart_airport: '', arrive_airport: '', depart_time: '', arrive_time: '', notes: '' }
  }

  async function add() {
    const payload = blank()
    const { data } = await sb.from('flights').insert(payload).select('*').single()
    setItems([...(items || []), data])
  }

  async function save(i: any) {
    await sb.from('flights').update(i).eq('id', i.id)
  }

  async function del(id: string) {
    await sb.from('flights').delete().eq('id', id)
    setItems(items.filter((x: any) => x.id !== id))
  }

  return (
    <div className="space-y-3">
      <button className="btn" onClick={add}>Add flight</button>
      {(items ?? []).map((f: any, idx: number) => (
        <div key={f.id || idx} className="border rounded-xl p-3">
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="Type">
              <select className="input" value={f.type} onChange={e=> setItems(items.map(x => x.id===f.id ? {...x, type: e.target.value} : x))}>
                <option>International</option>
                <option>Internal</option>
              </select>
            </Field>
            <Field label="Airline"><input className="input" value={f.airline || ''} onChange={e=> setItems(items.map(x => x.id===f.id ? {...x, airline: e.target.value} : x))} /></Field>
            <Field label="Flight #"><input className="input" value={f.flight_number || ''} onChange={e=> setItems(items.map(x => x.id===f.id ? {...x, flight_number: e.target.value} : x))} /></Field>
            <Field label="Depart airport"><input className="input" value={f.depart_airport || ''} onChange={e=> setItems(items.map(x => x.id===f.id ? {...x, depart_airport: e.target.value} : x))} /></Field>
            <Field label="Arrive airport"><input className="input" value={f.arrive_airport || ''} onChange={e=> setItems(items.map(x => x.id===f.id ? {...x, arrive_airport: e.target.value} : x))} /></Field>
            <Field label="Depart time"><input type="datetime-local" className="input" value={f.depart_time || ''} onChange={e=> setItems(items.map(x => x.id===f.id ? {...x, depart_time: e.target.value} : x))} /></Field>
            <Field label="Arrive time"><input type="datetime-local" className="input" value={f.arrive_time || ''} onChange={e=> setItems(items.map(x => x.id===f.id ? {...x, arrive_time: e.target.value} : x))} /></Field>
            <Field label="Notes"><textarea className="input" rows={2} value={f.notes || ''} onChange={e=> setItems(items.map(x => x.id===f.id ? {...x, notes: e.target.value} : x))} /></Field>
          </div>
          <div className="mt-2 flex gap-2">
            <button className="btn-primary" onClick={()=> save(items.find(x => x.id===f.id))}>Save</button>
            <button className="btn" onClick={()=> del(f.id)}>Delete</button>
          </div>
        </div>
      ))}
      {!items?.length && <div className="text-gray-600 text-sm">No flights yet.</div>}
    </div>
  )
}
