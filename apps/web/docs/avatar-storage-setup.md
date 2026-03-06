# Avatar Storage Setup

Profile avatar images are stored in Supabase Storage using a dedicated `avatars` bucket with Row Level Security (RLS) policies. Users can upload, update, and delete their own avatar images, while avatars are publicly readable.

## Prerequisites

- Supabase project with Auth enabled (see [authentication-setup.md](authentication-setup.md))

## Setup

### 1. Apply Storage Configuration

The `storage_avatars.sql` file creates the `avatars` bucket and its RLS policies. It is automatically applied by `pnpm db:run-migrate` in Supabase environments during deployment.

To apply manually, copy the contents of `drizzle/supabase/storage_avatars.sql` and run it in the Supabase Dashboard > **SQL Editor**.

The SQL creates:

- **`avatars` bucket** (public) — Avatar URLs are accessible without authentication
- **4 RLS policies** on `storage.objects`:
  - `avatars_insert_own` — Authenticated users can upload to their own folder
  - `avatars_update_own` — Authenticated users can update their own files
  - `avatars_delete_own` — Authenticated users can delete their own files
  - `avatars_select_public` — Anyone can read avatars

### 2. Verify

**Verification checklist:**

- Check Supabase Dashboard > **Storage** for the `avatars` bucket
- Verify the bucket is set to **Public**
- Verify RLS policies exist on `storage.objects` (Supabase Dashboard > **Authentication** > **Policies** > `storage.objects`)

## Idempotency

The SQL is convergent-idempotent — safe to run multiple times. Re-running will update the bucket settings and recreate policies to match the expected definitions, correcting any drift.

## Environment Variables

No new environment variables are required. Avatar storage uses the existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
