'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import InvoiceUpload from '@/components/InvoiceUpload'
import { IconPlane, IconHotel, IconCar, IconPlus } from '@/components/Icons'

type Trip = { id:string; title:string|null; description:string|null; location:string|null; start_date:string|null; end_date:string|null }
type Flight = {
  id:string; trip_id:string;
  flight_type:'international'|'internal'|null; carrier:string|null; flight_number:string|null;
  depart_airport:string|null; arrive_airport:string|null; depart_time:string|null; arrive_time:string|null; notes:string|null;
}
type Accommodation = { id:string; trip_id:string; name:string|null; address:string|null; check_in:string|null; check_out:string|null; booking_ref:string|null; notes:string|null }
type Transport = { id:string; trip_id:string; type:'car_hire'|'toll'|'train'|'taxi'|'other'|null; company:string|null; pickup_location:string|null; dropoff_location:string|null; start_time:string|null; end_time:string|null; cost:number|null; notes:string|null }
type Invoice = { id:string; trip_id:string; section:'flight'|'accommodation'|'transport'|'other'|null; file_url:string|null; file_path:string|null; amount?:number|null; currency?:string|null; flight_id?:string|null; accommodation_id?:string|null; transport_id?:string|null }

const fmtDate = (s?:string|null) => s ? new Date(s).toLocaleString(undefined, {year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—'
const fmtRange = (a?:string|null,b?:string|null) => `${fmtDate(a)} → ${fmtDate(b)}`

export default function TripDetailPage() {
  const params = useParams<{id:string}>()
  const id = params?.id?.toString()
  const sb = useMemo(()=>createClient(),[])
  const [status,setStatus]=useState<'loading'|'need-login'|'ready'|'not-found'|'error'>('loading')
  const [msg,setMsg]=useState('')
  const [trip,setTrip]=useState<Trip|null>(null)
  const [flights,setFlights]=useState<Flight[]>([])
  const [accs,setAccs]=useState<Accommodation[]>([])
  const [trans,setTrans]=useState<Transport[]>([])
  const [invoices,setInvoices]=useState<Invoice[]>([])
  const [signedUrls,setSignedUrls]=useState<Record<string,string>>({})

  const [openFlight,setOpenFlight]=useState<Record<string,boolean>>({})
  const [openAcc,setOpenAcc]=useState<Record<string,boolean>>({})
  const [openTrans,setOpenTrans]=useState<Record<string,boolean>>({})

  const [showFlightForm,setShowFlightForm]=useState(false)
  const [showAccForm,setShowAccForm]=useState(false)
  const [showTransForm,setShowTransForm]=useState(false)

  // quick create forms
  const [fType,setFType]=useState<'international'|'internal'>('international')
  const [carrier,setCarrier]=useState(''); const [fno,setFno]=useState('')
  const [depA,setDepA]=useState(''); const [arrA,setArrA]=useState('')
  const [depT,setDepT]=useState(''); const [arrT,setArrT]=useState(''); const [flightInvoice,setFlightInvoice]=useState<File|null>(null)

  const [accName,setAccName]=useState(''); const [accAddr,setAccAddr]=useState('')
  const [accIn,setAccIn]=useState(''); const [accOut,setAccOut]=useState(''); const [accRef,setAccRef]=useState(''); const [accInvoice,setAccInvoice]=useState<File|null>(null)

  const [tType,setTType]=useState<'car_hire'|'toll'|'train'|'taxi'|'other'>('car_hire')
  const [tCompany,setTCompany]=useState(''); const [tFrom,setTFrom]=useState(''); const [tTo,setTTo]=useState('')
  const [tStart,setTStart]=useState(''); const [tEnd,setTEnd]=useState(''); const [tCost,setTCost]=useState(''); const [tInvoice,setTInvoice]=useState<File|null>(null)

  function invFor(kind:'flight'|'accommodation'|'transport', itemId:string){
    return invoices.filter(i=>i.section===kind && (i as any)[`${kind}_id`]===itemId)
  }

  async function uploadInvoice(section:'flight'|'accommodation'|'transport', itemId:string, file:File){
    const safe=file.name.replace(/[^\w.\-]+/g,'_')
    const path=`${id}/${section}/${itemId}/${Date.now()}_${safe}`
    const up=await sb.storage.from('invoices').upload(path,file,{upsert:false}); if(up.error) throw up.error
    const {data:s}=await sb.storage.from('invoices').createSignedUrl(path,3600)
    const url=s?.signedUrl ?? null
    const payload:any={trip_id:id,section,name:file.name,file_path:path,file_url:url}
    if(section==='flight') payload.flight_id=itemId
    if(section==='accommodation') payload.accommodation_id=itemId
    if(section==='transport') payload.transport_id=itemId
    const ins=await sb.from('invoices').insert(payload); if(ins.error) throw ins.error
  }

  async function reloadAll(){
    if(!id) return
    const t=await sb.from('trips').select('*').eq('id',id).single()
    if(t.error){ setMsg(t.error.message); setStatus('error'); return }
    if(!t.data){ setStatus('not-found'); return }
    setTrip(t.data as Trip)

    const [fl,ac,tr,inv]=await Promise.all([
      sb.from('flights').select('*').eq('trip_id',id).order('depart_time',{ascending:true}),
      sb.from('accommodations').select('*').eq('trip_id',id).order('check_in',{ascending:true}),
      sb.from('transports').select('*').eq('trip_id',id).order('start_time',{ascending:true}),
      sb.from('invoices').select('*').eq('trip_id',id).order('uploaded_at',{ascending:false})
    ])
    if(fl.error||ac.error||tr.error||inv.error){ setMsg(fl.error?.message||ac.error?.message||tr.error?.message||inv.error?.message||'Failed to load'); setStatus('error'); return }
    setFlights((fl.data as Flight[])||[]); setAccs((ac.data as Accommodation[])||[]); setTrans((tr.data as Transport[])||[])
    const invRows=(inv.data as Invoice[])||[]; setInvoices(invRows)

    const map:Record<string,string>={}
    for(const row of invRows){
      if(row.file_path){ const {data:s}=await sb.storage.from('invoices').createSignedUrl(row.file_path,3600); if(s?.signedUrl) map[row.id]=s.signedUrl }
    }
    setSignedUrls(map)
    setStatus('ready')
  }

  useEffect(()=>{ if(!id) return; let cancel=false; (async()=>{
    const {data:{user}}=await sb.auth.getUser(); if(!user){ if(!cancel) setStatus('need-login'); return }
    if(!cancel) await reloadAll()
  })(); return ()=>{cancel=true} },[id,sb])

  if(status==='loading') return <div className="card">Loading…</div>
  if(status==='need-login') return <div className="card">You’re not logged in. <Link href="/login?next=/trips" className="underline">Login</Link></div>
  if(status==='not-found') return <div className="card">Trip not found. <Link href="/trips" className="underline">Back</Link></div>
  if(status==='error') return <div className="card" style={{color:'#b91c1c'}}>{msg}</div>

  const header = (
    <div className="trip-cover">
      <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'end'}}>
        <div>
          <h1 style={{margin:0,fontSize:28,fontWeight:700}}>{trip?.title || 'Untitled trip'}</h1>
          <div style={{opacity:.9}}>
            {trip?.location || '—'} • {trip?.start_date || '—'} → {trip?.end_date || '—'}
          </div>
        </div>
        <Link className="btn" href="/trips">Back to Trips</Link>
      </div>
    </div>
  )

  const FlightRow = (f:Flight) => {
    const open = !!openFlight[f.id]
    const invoicesFor = invFor('flight', f.id)
    return (
      <div>
        <div className="row" aria-expanded={open} onClick={()=>setOpenFlight(s=>({...s,[f.id]:!open}))}>
          <div className="row-left">
            <IconPlane /><div style={{minWidth:0}}>
              <div className="row-title">
                {(f.flight_type||'INTERNATIONAL').toUpperCase()} • {(f.carrier||'—')} {(f.flight_number||'')}
              </div>
              <div className="row-sub">
                {(f.depart_airport||'—')} → {(f.arrive_airport||'—')} • {fmtRange(f.depart_time,f.arrive_time)}
              </div>
            </div>
          </div>
          <div className="row-right">
            {!!invoicesFor.length && <span className="badge">{invoicesFor.length} invoice{invoicesFor.length>1?'s':''}</span>}
            <svg className="chevron" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
          </div>
        </div>

        {open && (
          <div className="details">
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
              <button className="btn" onClick={(e)=>{e.stopPropagation(); setOpenFlight(s=>({...s,[f.id]:true}))}}>
                Edit
              </button>
              <InvoiceUpload tripId={id!} section="flight" itemId={f.id} />
              {invoicesFor.map(i=>(
                <a key={i.id} className="btn" href={signedUrls[i.id]||i.file_url||'#'} target="_blank">View invoice</a>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:8}}>
              <label className="block"><span className="label">Type</span>
                <select className="input" defaultValue={f.flight_type||'international'} onChange={e=>f.flight_type=e.target.value as any}>
                  <option value="international">International</option>
                  <option value="internal">Internal</option>
                </select></label>
              <label className="block"><span className="label">Carrier</span>
                <input className="input" defaultValue={f.carrier||''} onChange={e=>f.carrier=e.target.value} /></label>
              <label className="block"><span className="label">Flight #</span>
                <input className="input" defaultValue={f.flight_number||''} onChange={e=>f.flight_number=e.target.value} /></label>
              <label className="block"><span className="label">Depart airport</span>
                <input className="input" defaultValue={f.depart_airport||''} onChange={e=>f.depart_airport=e.target.value} /></label>
              <label className="block"><span className="label">Arrive airport</span>
                <input className="input" defaultValue={f.arrive_airport||''} onChange={e=>f.arrive_airport=e.target.value} /></label>
              <label className="block"><span className="label">Depart time</span>
                <input className="input" type="datetime-local" defaultValue={f.depart_time?new Date(f.depart_time).toISOString().slice(0,16):''} onChange={e=>f.depart_time=e.target.value?new Date(e.target.value).toISOString():null} /></label>
              <label className="block"><span className="label">Arrive time</span>
                <input className="input" type="datetime-local" defaultValue={f.arrive_time?new Date(f.arrive_time).toISOString().slice(0,16):''} onChange={e=>f.arrive_time=e.target.value?new Date(e.target.value).toISOString():null} /></label>
            </div>
            <div style={{marginTop:8,display:'flex',gap:8}}>
              <button className="btn-primary" onClick={async()=>{
                const { error } = await sb.from('flights').update(f).eq('id', f.id)
                if(error) return alert(error.message)
                await reloadAll()
              }}>Save</button>
              <button className="btn" onClick={()=>setOpenFlight(s=>({...s,[f.id]:false}))}>Close</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const AccRow = (a:Accommodation) => {
    const open = !!openAcc[a.id]
    const invoicesFor = invFor('accommodation', a.id)
    return (
      <div>
        <div className="row" aria-expanded={open} onClick={()=>setOpenAcc(s=>({...s,[a.id]:!open}))}>
          <div className="row-left">
            <IconHotel /><div style={{minWidth:0}}>
              <div className="row-title">{a.name || 'Accommodation'}</div>
              <div className="row-sub">{a.address || '—'} • {a.check_in || '—'} → {a.check_out || '—'}</div>
            </div>
          </div>
          <div className="row-right">
            {!!invoicesFor.length && <span className="badge">{invoicesFor.length} invoice{invoicesFor.length>1?'s':''}</span>}
            <svg className="chevron" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
          </div>
        </div>

        {open && (
          <div className="details">
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
              <InvoiceUpload tripId={id!} section="accommodation" itemId={a.id} />
              {invoicesFor.map(i=>(
                <a key={i.id} className="btn" href={signedUrls[i.id]||i.file_url||'#'} target="_blank">View invoice</a>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:8}}>
              <label className="block"><span className="label">Name</span>
                <input className="input" defaultValue={a.name||''} onChange={e=>a.name=e.target.value} /></label>
              <label className="block"><span className="label">Address</span>
                <input className="input" defaultValue={a.address||''} onChange={e=>a.address=e.target.value} /></label>
              <label className="block"><span className="label">Check-in</span>
                <input className="input" type="date" defaultValue={a.check_in||''} onChange={e=>a.check_in=e.target.value||null} /></label>
              <label className="block"><span className="label">Check-out</span>
                <input className="input" type="date" defaultValue={a.check_out||''} onChange={e=>a.check_out=e.target.value||null} /></label>
              <label className="block"><span className="label">Booking ref</span>
                <input className="input" defaultValue={a.booking_ref||''} onChange={e=>a.booking_ref=e.target.value||null} /></label>
            </div>
            <div style={{marginTop:8,display:'flex',gap:8}}>
              <button className="btn-primary" onClick={async()=>{
                const { error } = await sb.from('accommodations').update(a).eq('id', a.id)
                if(error) return alert(error.message)
                await reloadAll()
              }}>Save</button>
              <button className="btn" onClick={()=>setOpenAcc(s=>({...s,[a.id]:false}))}>Close</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const TransRow = (t:Transport) => {
    const open = !!openTrans[t.id]
    const invoicesFor = invFor('transport', t.id)
    return (
      <div>
        <div className="row" aria-expanded={open} onClick={()=>setOpenTrans(s=>({...s,[t.id]:!open}))}>
          <div className="row-left">
            <IconCar /><div style={{minWidth:0}}>
              <div className="row-title">{(t.type||'car_hire')}{t.company ? ` • ${t.company}` : ''}</div>
              <div className="row-sub">{(t.pickup_location||'—')} → {(t.dropoff_location||'—')} • {fmtRange(t.start_time,t.end_time)}</div>
            </div>
          </div>
          <div className="row-right">
            {!!invoicesFor.length && <span className="badge">{invoicesFor.length} invoice{invoicesFor.length>1?'s':''}</span>}
            <svg className="chevron" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
          </div>
        </div>

        {open && (
          <div className="details">
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
              <InvoiceUpload tripId={id!} section="transport" itemId={t.id} />
              {invoicesFor.map(i=>(
                <a key={i.id} className="btn" href={signedUrls[i.id]||i.file_url||'#'} target="_blank">View invoice</a>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:8}}>
              <label className="block"><span className="label">Type</span>
                <select className="input" defaultValue={t.type||'car_hire'} onChange={e=>t.type=e.target.value as any}>
                  <option value="car_hire">Car hire</option><option value="toll">Toll</option>
                  <option value="train">Train</option><option value="taxi">Taxi</option><option value="other">Other</option>
                </select></label>
              <label className="block"><span className="label">Company</span>
                <input className="input" defaultValue={t.company||''} onChange={e=>t.company=e.target.value||null} /></label>
              <label className="block"><span className="label">Pickup</span>
                <input className="input" defaultValue={t.pickup_location||''} onChange={e=>t.pickup_location=e.target.value||null} /></label>
              <label className="block"><span className="label">Dropoff</span>
                <input className="input" defaultValue={t.dropoff_location||''} onChange={e=>t.dropoff_location=e.target.value||null} /></label>
              <label className="block"><span className="label">Start</span>
                <input className="input" type="datetime-local" defaultValue={t.start_time?new Date(t.start_time).toISOString().slice(0,16):''} onChange={e=>t.start_time=e.target.value?new Date(e.target.value).toISOString():null} /></label>
              <label className="block"><span className="label">End</span>
                <input className="input" type="datetime-local" defaultValue={t.end_time?new Date(t.end_time).toISOString().slice(0,16):''} onChange={e=>t.end_time=e.target.value?new Date(e.target.value).toISOString():null} /></label>
              <label className="block"><span className="label">Cost</span>
                <input className="input" type="number" defaultValue={t.cost?.toString()||''} onChange={e=>t.cost=e.target.value?Number(e.target.value):null} /></label>
            </div>
            <div style={{marginTop:8,display:'flex',gap:8}}>
              <button className="btn-primary" onClick={async()=>{
                const { error } = await sb.from('transports').update(t).eq('id', t.id)
                if(error) return alert(error.message)
                await reloadAll()
              }}>Save</button>
              <button className="btn" onClick={()=>setOpenTrans(s=>({...s,[t.id]:false}))}>Close</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {header}

      {/* Two-column layout */}
      <div className="trip-grid">
        {/* LEFT: Flights (wide) */}
        <div className="stack">
          <section className="section">
            <div className="section-head">
              <h2 className="section-title" style={{display:'flex',alignItems:'center',gap:8}}><IconPlane/> Flights</h2>
              <button className="btn" onClick={()=>setShowFlightForm(s=>!s)}>{showFlightForm ? 'Cancel' : (<><IconPlus/> Add flight</>)}</button>
            </div>
            <div className="section-card">
              {showFlightForm && (
                <div className="details" onClick={e=>e.stopPropagation()}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:8}}>
                    <label className="block"><span className="label">Type</span>
                      <select className="input" value={fType} onChange={e=>setFType(e.target.value as any)}>
                        <option value="international">International</option><option value="internal">Internal</option>
                      </select></label>
                    <label className="block"><span className="label">Carrier</span><input className="input" value={carrier} onChange={e=>setCarrier(e.target.value)} /></label>
                    <label className="block"><span className="label">Flight #</span><input className="input" value={fno} onChange={e=>setFno(e.target.value)} /></label>
                    <label className="block"><span className="label">Depart airport</span><input className="input" value={depA} onChange={e=>setDepA(e.target.value)} /></label>
                    <label className="block"><span className="label">Arrive airport</span><input className="input" value={arrA} onChange={e=>setArrA(e.target.value)} /></label>
                    <label className="block"><span className="label">Depart time</span><input className="input" type="datetime-local" value={depT} onChange={e=>setDepT(e.target.value)} /></label>
                    <label className="block"><span className="label">Arrive time</span><input className="input" type="datetime-local" value={arrT} onChange={e=>setArrT(e.target.value)} /></label>
                    <label className="block"><span className="label">Invoice (optional)</span>
                      <input className="input" type="file" accept="image/*,.pdf" onChange={e=>setFlightInvoice(e.target.files?.[0]||null)} /></label>
                  </div>
                  <div style={{marginTop:8}}>
                    <button className="btn-primary" onClick={async()=>{
                      const ins=await sb.from('flights').insert({
                        trip_id:id, flight_type:fType, carrier, flight_number:fno,
                        depart_airport:depA, arrive_airport:arrA,
                        depart_time:depT?new Date(depT).toISOString():null,
                        arrive_time:arrT?new Date(arrT).toISOString():null
                      }).select().single()
                      if(ins.error) return alert(ins.error.message)
                      if(ins.data?.id && flightInvoice){
                        try{ await uploadInvoice('flight', ins.data.id, flightInvoice) }catch(e:any){ alert('Flight saved, invoice upload failed: '+(e?.message||'unknown')) }
                      }
                      setCarrier(''); setFno(''); setDepA(''); setArrA(''); setDepT(''); setArrT(''); setFlightInvoice(null)
                      setShowFlightForm(false); await reloadAll()
                    }}>Add flight</button>
                  </div>
                </div>
              )}

              {flights.length===0 ? (
                <div className="row" onClick={()=>setShowFlightForm(true)}>
                  <div className="row-left"><IconPlane/><div><div className="row-title">No flights yet</div><div className="row-sub">Click to add your first flight</div></div></div><IconPlus/>
                </div>
              ) : (
                flights.map(f => <div key={f.id}>{FlightRow(f)}</div>)
              )}
            </div>
          </section>
        </div>

        {/* RIGHT: Accommodation + Transportation (stacked) */}
        <div className="stack">
          {/* Accommodation */}
          <section className="section">
            <div className="section-head">
              <h2 className="section-title" style={{display:'flex',alignItems:'center',gap:8}}><IconHotel/> Accommodation</h2>
              <button className="btn" onClick={()=>setShowAccForm(s=>!s)}>{showAccForm?'Cancel':(<><IconPlus/> Add</>)}</button>
            </div>
            <div className="section-card">
              {showAccForm && (
                <div className="details" onClick={e=>e.stopPropagation()}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:8}}>
                    <label className="block"><span className="label">Name</span><input className="input" value={accName} onChange={e=>setAccName(e.target.value)} /></label>
                    <label className="block"><span className="label">Address</span><input className="input" value={accAddr} onChange={e=>setAccAddr(e.target.value)} /></label>
                    <label className="block"><span className="label">Check-in</span><input className="input" type="date" value={accIn} onChange={e=>setAccIn(e.target.value)} /></label>
                    <label className="block"><span className="label">Check-out</span><input className="input" type="date" value={accOut} onChange={e=>setAccOut(e.target.value)} /></label>
                    <label className="block"><span className="label">Booking ref</span><input className="input" value={accRef} onChange={e=>setAccRef(e.target.value)} /></label>
                    <label className="block"><span className="label">Invoice (optional)</span><input className="input" type="file" accept="image/*,.pdf" onChange={e=>setAccInvoice(e.target.files?.[0]||null)} /></label>
                  </div>
                  <div style={{marginTop:8}}>
                    <button className="btn-primary" onClick={async()=>{
                      const ins=await sb.from('accommodations').insert({
                        trip_id:id, name:accName, address:accAddr, check_in:accIn||null, check_out:accOut||null, booking_ref:accRef||null
                      }).select().single()
                      if(ins.error) return alert(ins.error.message)
                      if(ins.data?.id && accInvoice){ try{ await uploadInvoice('accommodation', ins.data.id, accInvoice) }catch(e:any){ alert('Accommodation saved, invoice upload failed: '+(e?.message||'unknown')) } }
                      setAccName(''); setAccAddr(''); setAccIn(''); setAccOut(''); setAccRef(''); setAccInvoice(null)
                      setShowAccForm(false); await reloadAll()
                    }}>Add accommodation</button>
                  </div>
                </div>
              )}

              {accs.length===0 ? (
                <div className="row" onClick={()=>setShowAccForm(true)}><div className="row-left"><IconHotel/><div><div className="row-title">No accommodation yet</div><div className="row-sub">Click to add details</div></div></div><IconPlus/></div>
              ) : (
                accs.map(a => <div key={a.id}>{AccRow(a)}</div>)
              )}
            </div>
          </section>

          {/* Transportation */}
          <section className="section">
            <div className="section-head">
              <h2 className="section-title" style={{display:'flex',alignItems:'center',gap:8}}><IconCar/> Transportation</h2>
              <button className="btn" onClick={()=>setShowTransForm(s=>!s)}>{showTransForm?'Cancel':(<><IconPlus/> Add</>)}</button>
            </div>
            <div className="section-card">
              {showTransForm && (
                <div className="details" onClick={e=>e.stopPropagation()}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:8}}>
                    <label className="block"><span className="label">Type</span>
                      <select className="input" value={tType} onChange={e=>setTType(e.target.value as any)}>
                        <option value="car_hire">Car hire</option><option value="toll">Toll</option>
                        <option value="train">Train</option><option value="taxi">Taxi</option><option value="other">Other</option>
                      </select></label>
                    <label className="block"><span className="label">Company</span><input className="input" value={tCompany} onChange={e=>setTCompany(e.target.value)} /></label>
                    <label className="block"><span className="label">Pickup</span><input className="input" value={tFrom} onChange={e=>setTFrom(e.target.value)} /></label>
                    <label className="block"><span className="label">Dropoff</span><input className="input" value={tTo} onChange={e=>setTTo(e.target.value)} /></label>
                    <label className="block"><span className="label">Start</span><input className="input" type="datetime-local" value={tStart} onChange={e=>setTStart(e.target.value)} /></label>
                    <label className="block"><span className="label">End</span><input className="input" type="datetime-local" value={tEnd} onChange={e=>setTEnd(e.target.value)} /></label>
                    <label className="block"><span className="label">Cost</span><input className="input" type="number" step="0.01" value={tCost} onChange={e=>setTCost(e.target.value)} /></label>
                    <label className="block"><span className="label">Invoice (optional)</span><input className="input" type="file" accept="image/*,.pdf" onChange={e=>setTInvoice(e.target.files?.[0]||null)} /></label>
                  </div>
                  <div style={{marginTop:8}}>
                    <button className="btn-primary" onClick={async()=>{
                      const ins=await sb.from('transports').insert({
                        trip_id:id, type:tType, company:tCompany||null, pickup_location:tFrom||null, dropoff_location:tTo||null,
                        start_time:tStart?new Date(tStart).toISOString():null, end_time:tEnd?new Date(tEnd).toISOString():null,
                        cost:tCost?Number(tCost):null
                      }).select().single()
                      if(ins.error) return alert(ins.error.message)
                      if(ins.data?.id && tInvoice){ try{ await uploadInvoice('transport', ins.data.id, tInvoice) }catch(e:any){ alert('Transport saved, invoice upload failed: '+(e?.message||'unknown')) } }
                      setTCompany(''); setTFrom(''); setTTo(''); setTStart(''); setTEnd(''); setTCost(''); setTInvoice(null)
                      setShowTransForm(false); await reloadAll()
                    }}>Add transportation</button>
                  </div>
                </div>
              )}

              {trans.length===0 ? (
                <div className="row" onClick={()=>setShowTransForm(true)}><div className="row-left"><IconCar/><div><div className="row-title">No transportation yet</div><div className="row-sub">Click to add costs and car hire</div></div></div><IconPlus/></div>
              ) : (
                trans.map(t => <div key={t.id}>{TransRow(t)}</div>)
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
