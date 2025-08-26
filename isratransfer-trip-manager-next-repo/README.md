# IsraTransfer Trip Manager (Next.js + Supabase)

A minimal Next.js app wired to Supabase for auth, roles, trips, and invoice uploads synced across devices.

## Quick start

1. **Create a Supabase project** and copy your URL and anon key.
2. **Create a storage bucket** named `invoices` (private).
3. **Run schema**: paste `supabase/schema.sql` into the Supabase SQL editor and run it.
   - Create a team row: `insert into public.teams (name) values ('IsraTransfer');`
   - After your first login, set your profile to admin and link to the team:
     ```sql
     update public.profiles set role = 'admin', team_id = (select id from public.teams limit 1) where id = '<your-auth-user-uuid>';
     ```
4. **Install & run**:
   ```bash
   npm i
   cp .env.local.example .env.local
   # fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
   npm run dev
   ```

Open http://localhost:3000

## Roles
- `admin`: can update/delete any trip within the team, and manage others.
- `staff`: can create and update their own items; cannot delete trips per policies above.

## Where things live
- `app/` Next.js App Router pages
- `lib/supabase/` server & client helpers
- `components/` UI for trips and invoices
- `supabase/schema.sql` DB schema + RLS + storage policies

## Notes
- This scaffold uses client inserts/updates secured by Postgres RLS.
- Storage objects are private; we generate short-lived signed URLs for previews.
- Extend with meetings/contacts/budget by adding tables keyed by `trip_id`.
