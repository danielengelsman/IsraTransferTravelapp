"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const sb = useMemo(() => createBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function sendLink() {
    setMsg(""); setErr("");
    const siteUrl = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: siteUrl }
    });
    if (error) setErr(error.message);
    else setMsg("Magic link sent. Check your inbox.");
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2>Login</h2>
      <p><small className="muted">We use passwordless login. Enter your email and click the magic link you receive.</small></p>
      <label className="block">
        <span className="label">Email</span>
        <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
      </label>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="btn-primary" onClick={sendLink}>Send magic link</button>
      </div>
      {!!msg && <div style={{ marginTop: 8 }}>{msg}</div>}
      {!!err && <div style={{ marginTop: 8, color: "#fca5a5" }}>{err}</div>}
    </div>
  );
}
