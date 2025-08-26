'use client'

import { useState } from 'react'

export default function TripForm({ action, initial }: { action: (formData: FormData) => void, initial?: any }) {
  const [form, setForm] = useState(initial ?? { title: '', location: '', start_date: '', end_date: '', description: '' })
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await action(fd)
  }
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <label className="block">
        <span className="label">Title</span>
        <input name="title" className="input" value={form.title} onChange={e=> setForm({ ...form, title: e.target.value })} required />
      </label>
      <label className="block">
        <span className="label">Location / Event</span>
        <input name="location" className="input" value={form.location} onChange={e=> setForm({ ...form, location: e.target.value })} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Start date</span>
          <input type="date" name="start_date" className="input" value={form.start_date || ''} onChange={e=> setForm({ ...form, start_date: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">End date</span>
          <input type="date" name="end_date" className="input" value={form.end_date || ''} onChange={e=> setForm({ ...form, end_date: e.target.value })} />
        </label>
      </div>
      <label className="block">
        <span className="label">Description / Objectives</span>
        <textarea name="description" className="input" rows={4} value={form.description} onChange={e=> setForm({ ...form, description: e.target.value })} />
      </label>
      <button className="btn-primary" type="submit">{initial ? 'Save' : 'Create trip'}</button>
    </form>
  )
}
