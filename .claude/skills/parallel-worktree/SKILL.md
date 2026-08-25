---
name: parallel-worktree
description: >
  Operating rules for working on multiple issues in parallel with git
  worktrees in this monorepo. Use when the user asks to handle several
  issues/tasks in parallel, to spin up a worktree, or to run agents
  side by side. Do NOT use for ordinary single-task sessions — without
  a parallelism request, work in the main checkout as usual.
---

# Parallel work with git worktrees

Worktrees are **opt-in**: create one only when the user asked for
parallel work (or explicitly for a worktree). A single task belongs in
the main checkout.

The repository is pre-wired for `.claude/worktrees/` (gitignore,
ESLint, Metro exclusions; `.worktreeinclude` seeds `.env.local` and
engine assets; `worktree.baseRef` is `head` because local `main` is
routinely ahead of `origin/main`). Create worktrees with
`EnterWorktree` / `claude --worktree`, not by hand, so that seeding
runs.

## What may run in parallel — and what must not

The local Supabase stack is **one shared instance** for all worktrees:
`supabase/config.toml` is tracked and pins `project_id` and every port,
so per-worktree stacks are impossible. Everything below follows from
that.

- **Never** run `supabase start` / `supabase stop` / `supabase db
reset` from a worktree. They act on the shared stack; `db reset`
  destroys the main checkout's dev data without an error. Drive the
  stack from the main checkout only.
- **Do not parallelize** issues that touch the Drizzle schema or
  `apps/web/drizzle/` migrations. The schema is shared state, and the
  timestamp migration prefixes collide when generated concurrently.
  Run migration-bearing issues serially, in the main checkout.
- **Do not parallelize** dependency changes (`pnpm-lock.yaml`):
  concurrent installs against different lockfiles interfere via the
  shared store and produce conflicting lockfile diffs.
- **Serialize heavy DB consumers.** The local pooler budget is ~97
  client slots and a single `pnpm build` (7 workers × pool max 10) can
  consume nearly all of them; `apps/web` also has integration tests
  (`src/lib/db/*.integration.test.ts`) that open real connections and
  write to the shared DB. At most one `pnpm build` or one `apps/web`
  test run at a time, across all worktrees.

Good parallel candidates: UI fixes, i18n, refactors, anything whose
diff stays out of `schema.ts`, `drizzle/`, and `pnpm-lock.yaml`.

## Per-worktree setup (in order)

1. `pnpm install` — **before the first commit, not just before
   running anything.** pnpm's workspace links are relative
   (`node_modules/@blindfold-chess/* → ../../packages/*`), so the main
   checkout's `node_modules` must never be symlinked or reused: imports
   would resolve into the main checkout's `packages/`, silently mixing
   trees. The install is cheap (global store hardlinks) and its
   `prepare` step materializes `.husky/_`; until that exists, commits
   bypass the lint-staged pre-commit hook without any warning.
2. Pick ports: web `PORT=3001` (then 3002, …), Expo `--port 8082`
   (then 8083, …). After changing the web port, update
   `NEXT_PUBLIC_SITE_URL` in the copied `apps/web/.env.local`.

## Known limits (accepted, don't fight them)

- **Google OAuth only works on port 3000**: `additional_redirect_urls`
  is fixed in the tracked `config.toml`. In a worktree, verify flows
  with email/password login.
- **Auth cookies are shared across ports** (`sb-*-auth-token` on
  `localhost`): logging in on two worktrees in the same browser
  overwrites the session. Use separate browser profiles for
  simultaneous logins.
- **`git stash` is forbidden for agents**: `refs/stash` is shared
  across worktrees, so a stash/pop in one can drag in or drop another
  worktree's work. Commit to the worktree's branch instead.
- If `apps/web/engines/maia/` is missing in a worktree (the symlink
  setting didn't apply), the web prebuild re-downloads the 46 MB model
  — slow but harmless.

## Cleanup

Remove with `git worktree remove <path>` (never bare `rm -rf`; it
leaves stale metadata — if it happened, `git worktree prune`). Each
worktree grows its own `.next` and `.turbo` (multi-GB after builds),
so remove worktrees when their branch has merged.
