"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

type TripLite = { id: string; title: string };

export const dynamic = "force-dynamic";

export default function GlobalAIPage() {
  const sb = useMemo(() => createBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [trips, setTrips] = useState<TripLite[]>([]);
  const [tripId, setTripId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      setUserId(user?.id ?? null);
      if (user) {
        const { data } = await sb.from("trips").select("id,title").order("created_at", { ascending: false }).limit(100);
        setTrips((data as TripLite[]) || []);
      }
    })();
  }, [sb]);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []) as File[];
    if (!selected.length) return;
    setFiles(prev => prev.concat(selected));
  }

  async function sendToAI() {
    setErr(""); setResult(null);
    if (!userId) { setErr("Please log in."); return; }
    if (!prompt && files.length === 0) { setErr("Provide a description or attach documents."); return; }
    setSending(true);
    try {
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token;
      if (!token) { setErr("No session. Please login again."); setSending(false); return; }

      const fd = new FormData();
      if (tripId) fd.append("trip_id", tripId);
      if (prompt) fd.append("prompt", prompt);
      files.forEach(f => fd.append("files", f, f.name));

      const res = await fetch("/api/ai/ingest", {
        method: "POST",
        body: fd,
        headers: { authorization: `Bearer ${token}` }
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j?.error || "AI ingestion failed");
      } else {
        setResult(j);
      }
    } catch (e: any) {
      setErr(e?.message || "Network error");
    } finally {
      setSending(false);
    }
  }

  if (!userId) {
    return (<div className="card"><h2>Trip AI</h2><p>Please <a href="/login">login</a> first.</p></div>);
  }

  return (
    <div className="stack">
      <section className="section-card">
        <h2 style={{ marginTop: 0 }}>Trip AI (global)</h2>
        <div className="grid">
          <label>
            <span className="label">Attach to existing trip (optional)</span>
            <select className="input" value={tripId} onChange={e => setTripId(e.target.value)}>
              <option value="">— create a new trip —</option>
              {trips.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Describe the trip / documents</span>
            <textarea className="input" rows={5} value={prompt} onChange={e => setPrompt(e.target.value)} />
          </label>
          <label>
            <span className="label">Upload PDFs (tickets, hotel vouchers, etc.)</span>
            <input className="input" type="file" multiple onChange={onPickFiles} accept="application/pdf" />
          </label>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button className="btn-primary" disabled={sending} onClick={sendToAI}>{sending ? "Working…" : "Send to AI"}</button>
          <button className="btn" onClick={() => { setPrompt(""); setFiles([]); setResult(null); setErr(""); }}>Clear</button>
        </div>
        {!!err && <div style={{ color: "#fca5a5", marginTop: 8 }}>{err}</div>}
      </section>

      {!!result && (
        <section className="section-card">
          <h3 style={{ marginTop: 0 }}>Result</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</pre>
          {result?.trip && <a className="btn" href={`/trips/${result.trip.id}`}>Open Trip</a>}
        </section>
      )}
    </div>
  );
}
