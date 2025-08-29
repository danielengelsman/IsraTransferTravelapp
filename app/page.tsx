"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";

type Trip = {
  id: string;
  title: string;
  dest_city: string | null;
  dest_country: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const sb = useMemo(() => createBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [form, setForm] = useState({ title: "", dest_city: "", dest_country: "", start_date: "", end_date: "" });
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      setUserId(user?.id ?? null);
      if (user) {
        const { data } = await sb.from("trips").select("*").order("created_at", { ascending: false }).limit(100);
        setTrips((data as Trip[]) || []);
      }
    })();
  }, [sb]);

  async function createTrip() {
    setErr("");
    if (!form.title.trim()) { setErr("Title is required"); return; }
    const { data, error } = await sb.from("trips").insert({
      title: form.title.trim(),
      dest_city: form.dest_city || null,
      dest_country: form.dest_country || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null
    }).select("*").single();
    if (error) { setErr(error.message); return; }
    setTrips(prev => [data as Trip, ...prev]);
    setForm({ title: "", dest_city: "", dest_country: "", start_date: "", end_date: "" });
  }

  if (!userId) {
    return (
      <div className="card">
        <h2>Welcome</h2>
        <p>You must be logged in to view and create trips.</p>
        <Link className="btn" href="/login">Go to Login</Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <section className="section-card">
        <h2 style={{ marginTop: 0 }}>Create a Trip</h2>
        <div className="grid">
          <label className="block">
            <span className="label">Title *</span>
            <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">Destination City</span>
            <input className="input" value={form.dest_city} onChange={e => setForm({ ...form, dest_city: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">Destination Country</span>
            <input className="input" value={form.dest_country} onChange={e => setForm({ ...form, dest_country: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">Start Date</span>
            <input type="date" className="input" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">End Date</span>
            <input type="date" className="input" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
          </label>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button className="btn-primary" onClick={createTrip}>Create</button>
          {!!err && <div style={{ color: "#fca5a5" }}>{err}</div>}
        </div>
      </section>

      <section className="section-card">
        <h2 style={{ marginTop: 0 }}>All Trips</h2>
        {trips.length === 0 ? <p className="muted">No trips yet.</p> : (
          <table>
            <thead>
              <tr>
                <th>Title</th><th>Destination</th><th>Dates</th><th></th>
              </tr>
            </thead>
            <tbody>
              {trips.map(t => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td>{[t.dest_city, t.dest_country].filter(Boolean).join(", ") || <span className="muted">—</span>}</td>
                  <td>{[t.start_date, t.end_date].filter(Boolean).join(" → ") || <span className="muted">—</span>}</td>
                  <td><Link className="btn" href={`/trips/${t.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
