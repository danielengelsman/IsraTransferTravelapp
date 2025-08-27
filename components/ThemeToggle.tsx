'use client'
import { useEffect, useState } from 'react'
import { IconMoon, IconSun } from './Icons'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved ? saved === 'dark' : prefers
    document.documentElement.classList.toggle('dark', isDark)
    setDark(isDark)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button className="btn-ghost" onClick={toggle} aria-label="Toggle dark mode">
      {dark ? <IconSun className="w-4 h-4" /> : <IconMoon className="w-4 h-4" />}
      <span className="hidden sm:inline">{dark ? 'Light' : 'Dark'}</span>
    </button>
  )
}
