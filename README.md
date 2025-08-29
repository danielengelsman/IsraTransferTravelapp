# Trip AI Starter (Netlify + Next.js + Supabase)

A clean starter to manage business trips with AI ingestion of PDFs.

## Quick start

1. Create a Supabase project → SQL editor → paste `supabase/schema.sql` → **Run**.
2. In Netlify site settings → Environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - (optional) `OPENAI_MODEL` (default `gpt-4o-mini`)
3. Push this repo to GitHub and deploy on Netlify.
   - Build cmd: `npm run build`
   - Publish dir: `.next`

## Local dev

```bash
npm i
cp .env.example .env.local  # fill values
npm run dev
```

## How AI works

- Pages `/ai` and `/trips/[id]` let you upload PDFs and/or write a description.
- Client sends a FormData POST to `/api/ai/ingest` with a Supabase **Bearer** token.
- Server extracts text from PDFs (pdf-parse), asks OpenAI for structured JSON, then **inserts** trip/items.

All tables use RLS with "owner-only" access. Triggers set `created_by = auth.uid()` automatically
if you forget to send it.

## Notes

- Keep PDF sizes reasonable (a few MB). Very large PDFs will slow down functions.
- Extend UI with edit/delete forms as needed.
