'use client'
export const dynamic='force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
export default function NewTripPage(){
  const sb=createClient()
  const [title,setTitle]=useState(''); const [location,setLocation]=useState(''); const [start,setStart]=useState(''); const [end,setEnd]=useState(''); const [message,setMessage]=useState<string|null>(null)
  useEffect(()=>{ (async()=>{ const {data:{user}}=await sb.auth.getUser(); if(!user) window.location.href='/login?next=/trips/new' })() },[])
  async function create(){ setMessage(null); const { error } = await sb.from('trips').insert({ title,location,start_date:start,end_date:end }); if(error){ setMessage(error.message); return } window.location.href='/trips' }
  return (<div className="card max-w-lg mx-auto space-y-3">
    <h1 className="text-xl font-semibold">New Trip</h1>
    <label className="block"><span className="label">Title</span><input className="input" value={title} onChange={e=>setTitle(e.target.value)} /></label>
    <label className="block"><span className="label">Location</span><input className="input" value={location} onChange={e=>setLocation(e.target.value)} /></label>
    <div className="grid grid-cols-2 gap-3">
      <label className="block"><span className="label">Start date</span><input type="date" className="input" value={start} onChange={e=>setStart(e.target.value)} /></label>
      <label className="block"><span className="label">End date</span><input type="date" className="input" value={end} onChange={e=>setEnd(e.target.value)} /></label>
    </div>
    {message&&<div className="text-red-600 text-sm">{message}</div>}
    <button className="btn-primary" onClick={create}>Create</button>
  </div>)
}
