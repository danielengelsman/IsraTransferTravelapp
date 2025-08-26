import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TripForm from '@/components/TripForm'
import InvoiceUploader from '@/components/InvoiceUploader'
import { HotelForm, CarForm, FlightsList } from '@/components/TripClientParts'

export default async function TripDetail({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15 supplies params as a Promise in some cases; await it:
  const { id } = await params

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/trips/${id}`)

  const { data: trip } = await supabase.from('trips').select('*').eq('id', id).single()
  const { data: flights } = await supabase
    .from('flights')
    .select('*')
    .eq('trip_id', id)
    .order('depart_time', { ascending: true })
  const { data: hotel } = await supabase.from('hotels').select('*').eq('trip_id', id).maybeSingle()
  const { data: car } = await supabase.from('car_hires').select('*').eq('trip_id', id).maybeSingle()
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('trip_id', id)
    .order('uploaded_at', { ascending: false })

  async function saveTrip(formData: FormData) {
    'use server'
    const supabase = createClient()
    const payload = {
      title: String(formData.get('title') || ''),
      location: String(formData.get('location') || ''),
      start_date: String(formData.get('start_date') || ''),
      end_date: String(formData.get('end_date') || ''),
      description: String(formData.get('description') || ''),
    }
    await supabase.from('trips').update(payload).eq('id', id)
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-semibold mb-2">Trip</h1>
        <TripForm action={saveTrip} initial={trip} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-2">Hotel</h2>
          <HotelForm tripId={id} initial={hotel || null} />
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold mb-2">Car Hire</h2>
          <CarForm tripId={id} initial={car || null} />
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-2">Flights</h2>
        <FlightsList tripId={id} flights={flights || []} />
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-2">Invoices</h2>
        <InvoiceUploader tripId={id} existing={invoices || []} />
      </div>
    </div>
  )
}

