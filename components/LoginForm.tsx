'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
export default function LoginForm(){
  const sp=useSearchParams(); const nextUrl=sp.get('next')||'/trips'; const sb=createClient()
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [mode,setMode]=useState<'signin'|'signup'>('signin')
  const [loading,setLoading]=useState(false); const [error,setError]=useState<string|null>(null)
  useEffect(()=>{(async()=>{const {data:{user}}=await sb.auth.getUser(); if(user) window.location.replace(nextUrl)})()
    const {data:sub}=sb.auth.onAuthStateChange((_e,s)=>{ if(s?.user) window.location.replace(nextUrl) })
    return ()=>sub.subscription.unsubscribe()
  },[nextUrl])
  async function submit(e:React.FormEvent){ e.preventDefault(); setError(null); setLoading(true); try{
    if(mode==='signin'){ const {error}=await sb.auth.signInWithPassword({email,password}); if(error) throw error }
    else { const {error}=await sb.auth.signUp({email,password}); if(error) throw error }
  }catch(err:any){ setError(err?.message||'Something went wrong') } finally{ setLoading(false) } }
  return (<form className="space-y-3" onSubmit={submit}>
    <div className="flex gap-2 text-sm">
      <button type="button" className={`btn ${mode==='signin'?'btn-primary':''}`} onClick={()=>setMode('signin')}>Sign in</button>
      <button type="button" className={`btn ${mode==='signup'?'btn-primary':''}`} onClick={()=>setMode('signup')}>Sign up</button>
    </div>
    <label className="block"><span className="label">Email</span>
      <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
    <label className="block"><span className="label">Password</span>
      <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
    {error&&<div className="text-red-600 text-sm">{error}</div>}
    <button className="btn-primary" type="submit" disabled={loading}>{loading?'Please wait…':(mode==='signin'?'Sign in':'Create account')}</button>
  </form>)
}
