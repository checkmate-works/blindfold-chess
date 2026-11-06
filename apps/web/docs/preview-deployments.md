# Preview deployments get their database from Supabase Branching

`next build` needs a reachable Postgres: some `generateStaticParams`
implementations (`/[locale]/articles/[slug]`,
`/[locale]/glossary/letter/[letter]`) query the database at build
time, and `prebuild` runs
`scripts/prebuild-db.ts` (Drizzle migrate + seed) whenever
`POSTGRES_URL_NON_POOLING` / `POSTGRES_URL` / `DATABASE_URL` is set.
Pointing Preview at the production database is therefore never an
option — every feature-branch build would apply that branch's
migrations and seeds to production.

Instead, each pull request gets its own Supabase **preview branch** (an
isolated Supabase instance with an empty database). When the PR is
opened, Supabase creates the branch, writes the branch's credentials
into the Vercel project as Preview environment variables scoped to
that git branch (the same 16 keys the production integration manages:
`POSTGRES_*`, `SUPABASE_*`, `NEXT_PUBLIC_SUPABASE_*`), and triggers a
redeploy. The Vercel build then bootstraps the empty branch database
through the normal `prebuild` path: `migrate.ts` detects the
`supabase_auth_admin` role and applies the Drizzle migrations plus the
`drizzle/supabase/*.sql` extras (auth hook, grants, RLS, storage, cron).
Supabase's own migrate/seed steps have nothing to do here because
schema lives in `apps/web/drizzle/`, not `apps/web/supabase/migrations/`.

The branch is deleted — and its metered compute billing stops — when
the PR is merged or closed. Branch compute is billed per hour and is
**not** covered by the Pro plan's compute credits, so do not leave PRs
open for weeks.

`claude/*` PRs (the nightly issue pipeline and Claude Code cloud
sessions) get a Preview build like any other branch. Supabase creates a
branch for every PR regardless of its name — the GitHub integration has
no branch filter — so skipping the Vercel build for these refs would
keep paying for a database nothing uses, and would leave cloud sessions
without the one place their changes can be checked against a real
database.

## Dashboard settings this depends on

Supabase project → Settings → Integrations. Each one has a failure mode
that looks unrelated:

- **GitHub integration, "Supabase changes only": OFF.** With it on,
  a PR that does not touch `apps/web/supabase/` is ignored (the bot
  comments "no changes detected in `apps/web/supabase` directory"),
  and since schema changes live in `apps/web/drizzle/`, no PR ever
  qualifies. The symptom is the old build failure —
  `connect ECONNREFUSED 127.0.0.1:54322`, the local-dev fallback in
  `src/lib/db/index.ts` — because no credentials were ever written.
- **Vercel integration, "Preview" sync toggle: OFF.** That toggle
  copies the _production_ connection strings and service-role key
  into the Preview environment for every branch; the confirmation
  modal says so. It is not needed for branch-scoped sync, which
  happens on PR open regardless of the toggle.
- **Working directory: `apps/web`** (the parent of `supabase/`).
  **Automatic branching: ON. Deploy to production: OFF** — production
  schema is deployed by `prebuild` on the production build, not by
  Supabase.

To re-trigger branch creation for an existing PR (for example after
fixing one of the settings above), close and reopen the PR.

## Known gaps in a preview branch

`supabase/config.toml` sets `site_url = "http://localhost:3000"`, so
auth redirects on a Preview URL will not round-trip, and settings made
only in the production dashboard (OAuth client secrets, hook
enablement) are not mirrored. These do not affect the build.
