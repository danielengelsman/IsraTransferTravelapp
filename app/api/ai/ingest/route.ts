import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServerClientWithAuth } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Currency = "GBP" | "USD" | "CAD" | "EUR" | "ILS";

function sanitizeCurrency(s: any): Currency | null {
  const up = String(s || "").toUpperCase();
  return (["GBP","USD","CAD","EUR","ILS"] as const).includes(up as Currency) ? up as Currency : null;
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sb = createServerClientWithAuth(token);

    const form = await req.formData();
    const prompt = String(form.get("prompt") || "");
    const tripId = String(form.get("trip_id") || "");

    // Collect PDF text
    let docsText = "";
    const files = form.getAll("files") as File[];
    for (const f of files) {
      if (!f || typeof (f as any).arrayBuffer !== "function") continue;
      const name = f.name || "document.pdf";
      if (!name.toLowerCase().endsWith(".pdf")) continue;
      const buf = Buffer.from(await f.arrayBuffer());
      const pdfParse = (await import("pdf-parse")).default as any;
      const data = await pdfParse(buf);
      docsText += `\n\n# Document: ${name}\n${data.text || ""}`;
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const sys = `You extract structured trip data for a business travel app.
Return a STRICT JSON object with this shape:
{
  "trip": { "title": string, "dest_city": string|null, "dest_country": string|null, "start_date": string|null, "end_date": string|null } | null,
  "flights": [{
    "carrier": string|null, "flight_number": string|null,
    "depart_airport": string|null, "arrive_airport": string|null,
    "depart_time": string|null, "arrive_time": string|null,
    "cost_amount": number|null, "cost_currency": "GBP"|"USD"|"CAD"|"EUR"|"ILS"|null
  }],
  "accommodations": [{
    "name": string|null, "address": string|null,
    "check_in": string|null, "check_out": string|null,
    "cost_amount": number|null, "cost_currency": "GBP"|"USD"|"CAD"|"EUR"|"ILS"|null
  }],
  "transports": [{
    "kind": "car_hire"|"taxi"|"tolls"|"train"|"bus"|"other"|null,
    "date": string|null, "vendor": string|null,
    "cost_amount": number|null, "cost_currency": "GBP"|"USD"|"CAD"|"EUR"|"ILS"|null
  }],
  "events": [{
    "title": string, "location": string|null,
    "start_time": string|null, "end_time": string|null
  }]
}
- Dates/times as ISO strings when possible.
- Only include what you are confident in; otherwise set fields to null.
- If no trip exists yet and you can infer basic details (title, dest, dates), include a "trip".`;

    const userPrompt = `Context from PDFs (may be empty):
${docsText}

User description (may be empty):
${prompt}

Return ONLY the JSON object, no commentary.`;

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const chat = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2
    });

    const raw = chat.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch {}

    const tripInput = parsed?.trip ?? null;
    const flights = Array.isArray(parsed?.flights) ? parsed.flights : [];
    const accommodations = Array.isArray(parsed?.accommodations) ? parsed.accommodations : [];
    const transports = Array.isArray(parsed?.transports) ? parsed.transports : [];
    const events = Array.isArray(parsed?.events) ? parsed.events : [];

    // Ensure we have a trip
    let finalTripId = tripId || "";
    let newTrip: any = null;

    if (!finalTripId) {
      const title = (tripInput?.title && String(tripInput.title).slice(0, 140)) || "New Trip";
      const { data, error } = await sb.from("trips")
        .insert({
          title,
          dest_city: tripInput?.dest_city || null,
          dest_country: tripInput?.dest_country || null,
          start_date: tripInput?.start_date || null,
          end_date: tripInput?.end_date || null
        })
        .select("*").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      finalTripId = data.id;
      newTrip = data;
    } else {
      // verify ownership
      const { data, error } = await sb.from("trips").select("id").eq("id", finalTripId).single();
      if (error || !data) return NextResponse.json({ error: "Trip not found or not yours" }, { status: 404 });
    }

    // Normalise currencies
    const norm = (v: any) => (v === null || v === undefined ? null : v);
    let inserted = { flights: 0, accommodations: 0, transports: 0, events: 0 };

    if (flights.length) {
      const rows = flights.map((f: any) => ({
        trip_id: finalTripId,
        carrier: norm(f.carrier),
        flight_number: norm(f.flight_number),
        depart_airport: norm(f.depart_airport),
        arrive_airport: norm(f.arrive_airport),
        depart_time: norm(f.depart_time),
        arrive_time: norm(f.arrive_time),
        cost_amount: f.cost_amount ?? null,
        cost_currency: sanitizeCurrency(f.cost_currency)
      }));
      const { error, count } = await sb.from("flights").insert(rows, { count: "exact" });
      if (!error) inserted.flights = count || rows.length;
    }

    if (accommodations.length) {
      const rows = accommodations.map((a: any) => ({
        trip_id: finalTripId,
        name: norm(a.name),
        address: norm(a.address),
        check_in: norm(a.check_in),
        check_out: norm(a.check_out),
        cost_amount: a.cost_amount ?? null,
        cost_currency: sanitizeCurrency(a.cost_currency)
      }));
      const { error, count } = await sb.from("accommodations").insert(rows, { count: "exact" });
      if (!error) inserted.accommodations = count || rows.length;
    }

    if (transports.length) {
      const rows = transports.map((t: any) => ({
        trip_id: finalTripId,
        kind: norm(t.kind),
        date: norm(t.date),
        vendor: norm(t.vendor),
        cost_amount: t.cost_amount ?? null,
        cost_currency: sanitizeCurrency(t.cost_currency)
      }));
      const { error, count } = await sb.from("transports").insert(rows, { count: "exact" });
      if (!error) inserted.transports = count || rows.length;
    }

    if (events.length) {
      const rows = events.map((e: any) => ({
        trip_id: finalTripId,
        title: String(e.title || "Event"),
        location: norm(e.location),
        start_time: norm(e.start_time),
        end_time: norm(e.end_time)
      }));
      const { error, count } = await sb.from("itinerary_events").insert(rows, { count: "exact" });
      if (!error) inserted.events = count || rows.length;
    }

    return NextResponse.json({ trip: newTrip ? newTrip : { id: finalTripId }, inserted });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
