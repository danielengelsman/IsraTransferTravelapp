"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

type Trip = { id: string; title: string; dest_city: string | null; dest_country: string | null; start_date: string | null; end_date: string | null; };
type Flight = { id: string; carrier: string | null; flight_number: string | null; depart_airport: string | null; arrive_airport: string | null; depart_time: string | null; arrive_time: string | null; cost_amount: number | null; cost_currency: string | null; };
type Accommodation = { id: string; name: string | null; address: string | null; check_in: string | null; check_out: string | null; cost_amount: number | null; cost_currency: string | null; };
type Transport = { id: string; kind: string | null; date: string | null; vendor: string | null; cost_amount: number | null; cost_currency: string | null; };
type Event = { id: string; title: string; location: string | null; start_time: string | null; end_time: string | null; };

export const dynamic = "force-dynamic";

export default function TripPage() {
  const sb = useMemo(() => createBrowserClient(), []);
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [stays, setStays] = useState<Accommodation[]>([]);
  const [trans, setTrans] = useState<Transport[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data: trip } = await sb.from("trips").select("*").eq("id", id).single();
      setTrip(trip as Trip);
      const [{ data: f }, { data: a }, { data: tr }, { data: ev }] = await Promise.all([
        sb.from("flights").select("*").eq("trip_id", id).order("depart_time", { ascending: true }),
        sb.from("accommodations").select("*").eq("trip_id", id).order("check_in", { ascending: true }),
        sb.from("transports").select("*").eq("trip_id", id).order("date", { ascending: true }),
        sb.from("itinerary_events").select("*").eq("trip_id", id).order("start_time", { ascending: true }),
      ]);
      setFlights((f as Flight[]) || []);
      setStays((a as Accommodation[]) || []);
      setTrans((tr as Transport[]) || []);
      setEvents((ev as Event[]) || []);
    })();
  }, [sb, id]);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []) as File[];
    if (!selected.length) return;
    setFiles(prev => prev.concat(selected));
  }

  async function sendToAI() {
    setErr(""); setResult(null);
    setSending(true);
    try {
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token;
      if (!token) { setErr("No session."); setSending(false); return; }
      const fd = new FormData();
      fd.append("trip_id", id);
      if (prompt) fd.append("prompt", prompt);
      files.forEach(f => fd.append("files", f, f.name));
      const res = await fetch("/api/ai/ingest", { method: "POST", body: fd, headers: { authorization: `Bearer ${token}` } });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j?.error || "AI failed"); else {
        setResult(j);
        // refresh lists quickly
        const [{ data: f }, { data: a }, { data: tr }, { data: ev }] = await Promise.all([
          sb.from("flights").select("*").eq("trip_id", id).order("depart_time", { ascending: true }),
          sb.from("accommodations").select("*").eq("trip_id", id).order("check_in", { ascending: true }),
          sb.from("transports").select("*").eq("trip_id", id).order("date", { ascending: true }),
          sb.from("itinerary_events").select("*").eq("trip_id", id).order("start_time", { ascending: true }),
        ]);
        setFlights((f as Flight[]) || []);
        setStays((a as Accommodation[]) || []);
        setTrans((tr as Transport[]) || []);
        setEvents((ev as Event[]) || []);
      }
    } catch (e: any) {
      setErr(e?.message || "Network error");
    } finally {
      setSending(false);
    }
  }

  if (!trip) return <div className="card">Loading…</div>;

  return (
    <div className="stack">
      <section className="section-card">
        <h2 style={{ marginTop: 0 }}>{trip.title}</h2>
        <div><small className="muted">{[trip.dest_city, trip.dest_country].filter(Boolean).join(", ") || "—"} · {[trip.start_date, trip.end_date].filter(Boolean).join(" → ") || "—"}</small></div>
      </section>

      <section className="section-card">
        <h3 style={{ marginTop: 0 }}>AI for this trip</h3>
        <label className="block">
          <span className="label">Describe what to add / attach docs</span>
          <textarea className="input" rows={4} value={prompt} onChange={e => setPrompt(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">PDFs</span>
          <input type="file" className="input" multiple accept="application/pdf" onChange={onPickFiles} />
        </label>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button className="btn-primary" disabled={sending} onClick={sendToAI}>{sending ? "Working…" : "Send to AI"}</button>
          <button className="btn" onClick={() => { setPrompt(""); setFiles([]); setErr(""); setResult(null); }}>Clear</button>
        </div>
        {!!err && <div style={{ color: "#fca5a5", marginTop: 8 }}>{err}</div>}
        {!!result && <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{JSON.stringify(result, null, 2)}</pre>}
      </section>

      <section className="section-card">
        <h3 style={{ marginTop: 0 }}>Flights</h3>
        {flights.length === 0 ? <p className="muted">None</p> : (
          <table>
            <thead><tr><th>Carrier</th><th>No.</th><th>Route</th><th>When</th><th>Cost</th></tr></thead>
            <tbody>{flights.map(f => (
              <tr key={f.id}>
                <td>{f.carrier || "—"}</td>
                <td>{f.flight_number || "—"}</td>
                <td>{[f.depart_airport, f.arrive_airport].filter(Boolean).join(" → ") || "—"}</td>
                <td>{[f.depart_time, f.arrive_time].filter(Boolean).join(" → ") || "—"}</td>
                <td>{f.cost_amount ? `${f.cost_amount} ${f.cost_currency || ""}` : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>

      <section className="section-card">
        <h3 style={{ marginTop: 0 }}>Accommodation</h3>
        {stays.length === 0 ? <p className="muted">None</p> : (
          <table>
            <thead><tr><th>Name</th><th>When</th><th>Address</th><th>Cost</th></tr></thead>
            <tbody>{stays.map(s => (
              <tr key={s.id}>
                <td>{s.name || "—"}</td>
                <td>{[s.check_in, s.check_out].filter(Boolean).join(" → ") || "—"}</td>
                <td>{s.address || "—"}</td>
                <td>{s.cost_amount ? `${s.cost_amount} ${s.cost_currency || ""}` : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>

      <section className="section-card">
        <h3 style={{ marginTop: 0 }}>Transport</h3>
        {trans.length === 0 ? <p className="muted">None</p> : (
          <table>
            <thead><tr><th>Kind</th><th>Date</th><th>Vendor</th><th>Cost</th></tr></thead>
            <tbody>{trans.map(t => (
              <tr key={t.id}>
                <td>{t.kind || "—"}</td>
                <td>{t.date || "—"}</td>
                <td>{t.vendor || "—"}</td>
                <td>{t.cost_amount ? `${t.cost_amount} ${t.cost_currency || ""}` : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>

      <section className="section-card">
        <h3 style={{ marginTop: 0 }}>Itinerary</h3>
        {events.length === 0 ? <p className="muted">None</p> : (
          <table>
            <thead><tr><th>Title</th><th>When</th><th>Location</th></tr></thead>
            <tbody>{events.map(ev => (
              <tr key={ev.id}>
                <td>{ev.title}</td>
                <td>{[ev.start_time, ev.end_time].filter(Boolean).join(" → ") || "—"}</td>
                <td>{ev.location || "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
    </div>
  );
}
