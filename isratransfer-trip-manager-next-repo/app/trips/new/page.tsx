import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TripForm from '@/components/TripForm'

export default async function NewTripPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/trips/new')

  async function createTrip(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect('/login?next=/trips/new')
    const payload = {
      title: String(formData.get('title') || ''),
      location: String(formData.get('location') || ''),
      start_date: String(formData.get('start_date') || ''),
      end_date: String(formData.get('end_date') || ''),
      description: String(formData.get('description') || ''),
    }
    const { data, error } = await supabase.from('trips').insert(payload).select('id').single()
    if (error) throw error
    redirect(`/trips/${data.id}`)
  }

  return <TripForm action={createTrip} />
}
