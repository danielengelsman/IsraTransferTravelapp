'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type UserRole = 'admin'|'sales'|'finance'
export function useMe(){
  const sb = createClient()
  const [me,setMe] = useState<{ id:string; role:UserRole }|null>(null)
  useEffect(()=>{ (async()=>{
    const { data:{ user } } = await sb.auth.getUser()
    if(!user){ setMe(null); return }
    const { data } = await sb.from('profiles').select('role').eq('id', user.id).single()
    setMe({ id:user.id, role:(data?.role || 'sales') as UserRole })
  })() },[])
  return me
}
