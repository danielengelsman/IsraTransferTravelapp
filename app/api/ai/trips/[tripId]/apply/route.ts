// app/api/ai/trips/[tripId]/apply/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request, ctx: any) {
  try {
    const tripId = ctx?.params?.tripId;
    if (!tripId) return NextResponse.json({ error: "Missing tripId" }, { status: 400 });

    const sb = createServerSupabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const fd = await req.formData();
    const text = String(fd.get("text") || fd.get("prompt") || "").trim();

    // ---- Optional PDF extraction (still works if you upload nothing) ----
    let docsText = "";
    const all = [...fd.getAll("files"), ...fd.getAll("pdfs")];
    for (const f of all) {
      if (typeof f === "string") continue;
      const file = f as File;
      if (!file.name.toLowerCase().endsWith(".pdf")) continue;
      // dynamic import to keep bundle small
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const pdfParse = (await import("pdf-parse")).default;
      const buf = Buffer.from(await file.arrayBuffer());
      const data = await pdfParse(buf);
      docsText += `\n\n# Document: ${file.name}\n${data.text ?? ""}`;
    }

    // ---- Ask OpenAI to produce structured actions ----
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const system = `
You turn emails/descriptions/receipts into JSON actions to update a travel DB.

Return ONLY JSON with this schema:
{
  "items":[
    {"type":"flight","data":{
      "origin_city":"","destination_city":"",
      "depart_at":"YYYY-MM-DD or ISO","arrive_at":"YYYY-MM-DD or ISO",
      "airline":"","price":null,"currency":"GBP|USD|CAD|EUR|ILS"
    }},
    {"type":"accommodation","data":{
      "hotel_name":"","address":"",
      "check_in":"YYYY-MM-DD","check_out":"YYYY-MM-DD",
      "price":null,"currency":"GBP|USD|CAD|EUR|ILS"
    }},
    {"type":"transport","data":{
      "mode":"car|taxi|train|bus|toll|other","provider":"",
      "when":"YYYY-MM-DD or ISO","amount":null,"currency":"GBP|USD|CAD|EUR|ILS","notes":""
    }},
    {"type":"itinerary_event","data":{
      "title":"","starts_at":"YYYY-MM-DD or ISO","ends_at":"YYYY-MM-DD or ISO",
      "location":"","notes":""
    }}
  ]
}

If a field is unknown, omit it. Use the five currency codes only. Temperature=0.
`;

    let plan: { items: any[] } = { items: [] };

    if (text || docsText) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `${text}${docsText ? `\n\nContext from PDFs:\n${docsText}` : ""}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0
      });

      const raw = completion.choices?.[0]?.message?.content ?? '{"items":[]}';
      try { plan = JSON.parse(raw) } catch { plan = { items: [] }; }
    }

    // ---- Apply actions into Supabase ----
    const results = { flights: 0, accommodations: 0, transport: 0, events: 0, errors: [] as string[] };

    for (const item of plan.items || []) {
      const t = String(item?.type || "").toLowerCase();
      const d = item?.data || {};
      try {
        if (t === "flight") {
          const row = {
            trip_id: tripId,
            created_by: user.id,
            origin_city: d.origin_city ?? null,
            destination_city: d.destination_city ?? null,
            depart_at: d.depart_at ?? null,
            arrive_at: d.arrive_at ?? null,
            airline: d.airline ?? null,
            price_cents: toCents(d.price),
            currency: pickCurrency(d.currency)
          };
          const { error } = await sb.from("flights").insert(row);
          if (error) throw error;
          results.flights++;
        } else if (t === "accommodation") {
          const row = {
            trip_id: tripId,
            created_by: user.id,
            hotel_name: d.hotel_name ?? null,
            address: d.address ?? null,
            check_in: d.check_in ?? null,
            check_out: d.check_out ?? null,
            price_cents: toCents(d.price),
            currency: pickCurrency(d.currency)
          };
          const { error } = await sb.from("accommodations").insert(row);
          if (error) throw error;
          results.accommodations++;
        } else if (t === "transport") {
          const row = {
            trip_id: tripId,
            created_by: user.id,
            mode: d.mode ?? "other",
            provider: d.provider ?? null,
            when: d.when ?? null,
            amount_cents: toCents(d.amount),
            currency: pickCurrency(d.currency),
            notes: d.notes ?? null
          };
          const { error } = await sb.from("transport").insert(row);
          if (error) throw error;
          results.transport++;
        } else if (t === "itinerary_event") {
          const row = {
            trip_id: tripId,
            created_by: user.id,
            title: d.title ?? "Event",
            starts_at: d.starts_at ?? null,
            ends_at: d.ends_at ?? null,
            location: d.location ?? null,
            notes: d.notes ?? null
          };
          const { error } = await sb.from("itinerary_events").insert(row);
          if (error) throw error;
          results.events++;
        }
      } catch (e: any) {
        results.errors.push(`${t || "unknown"}: ${e?.message || String(e)}`);
      }
    }

    return NextResponse.json({ ok: true, applied: results, plan });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

function toCents(x: any) {
  const n = typeof x === "string" ? parseFloat(x.replace(/[^0-9.]/g, "")) : Number(x);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
function pickCurrency(c: any) {
  const v = String(c || "").toUpperCase();
  return ["GBP", "USD", "CAD", "EUR", "ILS"].includes(v) ? v : null;
}
