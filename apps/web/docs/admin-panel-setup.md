# Admin Panel Setup

The admin panel provides user management capabilities at `/admin`. It uses Role-Based Access Control (RBAC) with a `user_roles` table and Supabase Auth's Custom Access Token Hook.

## Architecture

```
Request to /admin
  │
  ▼
proxy.ts (Edge)
  └── Is user authenticated? → No → 404
  │
  ▼
admin/layout.tsx (Server)
  └── Does user have admin role in user_roles? → No → 404
  │
  ▼
Admin page rendered
```

- **proxy.ts**: Lightweight auth check at the Edge. Returns 404 for unauthenticated users (does not reveal admin panel existence).
- **admin/layout.tsx**: Queries `user_roles` table via Drizzle to verify the user has the `admin` role. Returns 404 for non-admin users.
- **Custom Access Token Hook**: Injects `user_role` into the JWT for use in RLS policies. Not used by the admin layout directly, but required for database-level security.

## Prerequisites

- Supabase project with Auth enabled (see [authentication-setup.md](authentication-setup.md))
- At least one user signed up via Google Sign-In
- `SUPABASE_SERVICE_ROLE_KEY` environment variable (see below)

## Setup

### 1. Add Environment Variable

Add `SUPABASE_SERVICE_ROLE_KEY` to your environment:

- **Local**: Add to `.env.local`
- **Vercel**: Add in Project Settings > Environment Variables

Get the value from Supabase Dashboard > **Project Settings** > **API Keys** > `service_role` (secret).

> **WARNING**: Do NOT prefix with `NEXT_PUBLIC_`. This key grants full access to Supabase (bypasses RLS, manages users) and must never be exposed to the browser. The admin client helper is guarded by `import 'server-only'` to prevent accidental client-side imports.

### 2. Apply Database Schema

The `user_roles` table is included in the Drizzle schema. Apply it using:

```bash
# Local development
pnpm db:push
```

`db:push` compares the current schema with the database and applies only the differences (idempotent).

For production (Supabase), no manual migration is needed — the `prebuild` script automatically runs `pnpm db:run-migrate` during deployment.

### 3. Apply Custom Access Token Hook

The hook function is in `drizzle/supabase/custom_access_token_hook.sql`. For production (Supabase), this is also handled automatically — `pnpm db:run-migrate` detects the Supabase environment and applies the hook after migrations during deployment. If you need to apply it manually, use `pnpm db:setup-auth-hook`.

> **Note**: The hook SQL requires Supabase-managed roles (`supabase_auth_admin`, `authenticated`, `anon`) and will intentionally fail on local PostgreSQL. This is expected — the hook is only meaningful in a Supabase environment.

### 4. Enable the Hook in Supabase Dashboard

After applying the SQL, register the hook in Supabase:

1. Go to **Authentication** > **Hooks**
2. Enable **Custom Access Token Hook**
3. Select schema: `public`
4. Select function: `custom_access_token_hook`
5. Save

This is a **one-time setup**. Updating the function via `CREATE OR REPLACE` does not require re-registration.

### 5. Grant Admin Role

Find your user ID and insert an admin role:

```sql
-- Find your user ID
SELECT id, email FROM auth.users;

-- Grant admin role
INSERT INTO user_roles (user_id, role) VALUES ('<your-uuid>', 'admin');
```

Run this in:

- **Local**: `psql postgresql://postgres:postgres@localhost:5432/blindfold_chess`
- **Remote**: Supabase Dashboard > **SQL Editor**

### 6. Sign Out and Sign Back In

The JWT is updated on the next token issuance. Sign out and sign back in to pick up the new role.

### 7. Verify

Navigate to `/admin`. You should see the admin dashboard.

**Verification checklist:**

- Admin account: `/admin` shows the dashboard
- Non-admin account: `/admin` returns 404
- Not signed in: `/admin` returns 404

## Local Development Notes

For local development, only steps 1, 2, and 5 are required:

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
2. `pnpm db:push` to create the `user_roles` table locally
3. Insert your admin role into the local database

Steps 3-4 (hook setup) are Supabase-only. The admin panel's authorization works without the hook because `admin/layout.tsx` queries the `user_roles` table directly via Drizzle.

## Available Scripts

| Script                    | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `pnpm db:push`            | Apply schema changes to database (idempotent)      |
| `pnpm db:run-migrate`     | Run migrations + auth hook (auto-detects Supabase) |
| `pnpm db:setup-auth-hook` | Manually apply auth hook SQL (Supabase only)       |

## Security Notes

- The `user_roles` table has **Row Level Security (RLS) enabled** with no permissive policies for `authenticated` or `anon` roles. Users cannot read or modify roles via the Supabase client.
- The `SUPABASE_SERVICE_ROLE_KEY` is used only in server-side code (`src/lib/supabase/admin.ts`), protected by `import 'server-only'`.
- Admin routes return 404 (not 403) to avoid revealing the admin panel's existence.
- Admin path matching in `proxy.ts` is case-insensitive to prevent bypass via `/Admin` or `/ADMIN`.
