'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const params = useSearchParams()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    setMessage('')

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email to confirm your account.')
      }
      const next = params.get('next') || '/trips'
      router.push(next)
      router.refresh()
    } catch (err: any) {
      setMessage(err.message || 'Authentication error')
    }
  }

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-2xl font-semibold mb-2">{mode === 'signin' ? 'Sign in' : 'Sign up'}</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e)=> setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={(e)=> setPassword(e.target.value)} required />
        </div>
        {message && <p className="text-sm text-red-600">{message}</p>}
        <div className="flex items-center gap-2">
          <button className="btn-primary" type="submit">{mode === 'signin' ? 'Sign in' : 'Create account'}</button>
          <button className="btn" type="button" onClick={()=> setMode(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? 'Need an account?' : 'Have an account?'}
          </button>
        </div>
      </form>
    </div>
  )
}
