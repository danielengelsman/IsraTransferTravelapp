'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('next') || '/trips'
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 👉 If already logged in, go straight to nextUrl
  useEffect(() => {
    let unsub: (() => void) | undefined

    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        window.location.replace(nextUrl)
        return
      }
      // also listen for the session to appear right after sign-in
      const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
        if (sess) window.location.replace(nextUrl)
      })
      unsub = sub.subscription.unsubscribe
    })()

    return () => { try { unsub?.() } catch {} }
  }, [nextUrl])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
      // Safety redirect (onAuthStateChange should also catch it)
      window.location.replace(nextUrl)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="flex gap-2 text-sm">
        <button type="button" className={`btn ${mode==='signin'?'btn-primary':''}`} onClick={() => setMode('signin')}>Sign in</button>
        <button type="button" className={`btn ${mode==='signup'?'btn-primary':''}`} onClick={() => setMode('signup')}>Sign up</button>
      </div>
      <label className="block">
        <span className="label">Email</span>
        <input className="input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
      </label>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? 'Please wait…' : (mode === 'signin' ? 'Sign in' : 'Create account')}
      </button>
    </form>
  )
}
