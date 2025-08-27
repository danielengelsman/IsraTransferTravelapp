'use client'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
export default function Header(){
  const sb=createClient()
  const [email,setEmail]=useState<string|null>(null)
  useEffect(()=>{(async()=>{const {data:{user}}=await sb.auth.getUser();setEmail(user?.email??null)})()},[])
  async function signOut(){ await sb.auth.signOut(); window.location.href='/login' }
  return (<div className="bg-white border-b"><div className="max-w-5xl mx-auto p-4 flex items-center justify-between">
    <Link href="/trips" className="font-semibold">IsraTransfer Travel</Link>
    <div className="flex items-center gap-3">{email?(<><span className="text-sm text-gray-600">{email}</span><button className="btn" onClick={signOut}>Sign out</button></>):(<Link className="btn" href="/login">Login</Link>)}</div>
  </div></div>)
}
