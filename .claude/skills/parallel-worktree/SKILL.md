---
name: parallel-worktree
description: >
  Fan out multiple issues to parallel subagents, each in its own git
  worktree. Use when the user asks to implement/handle several
  issues or tasks in parallel (並列に実装/並列で対応), to spin up
  worktrees, or to run agents side by side. Includes the triage that
  decides whether the issues are safe to parallelize at all. Do NOT
  use for ordinary single-task sessions — without a parallelism
  request, work in the main checkout as usual.
---

# Parallel implementation via worktree fan-out

Parallel work is **opt-in**: enter this flow only when the user asked
for it. A single task belongs in the main checkout, worked directly.

Execution model: this session is the **coordinator**. Implementation
is fanned out to subagents (`Agent` tool, `isolation: "worktree"`,
one call per issue, all in one message so they run concurrently).
The repo is pre-wired for this: `.claude/worktrees/` is fenced from
every scanner, `.worktreeinclude` seeds `.env.local` and engine
assets into each subagent worktree, `worktree.baseRef` is `head`.

## Step 1 — Triage: decide what may run in parallel

Do this BEFORE spawning anything. Read each issue (`gh issue view N`)
and locate the code it touches. An issue qualifies for fan-out only
if ALL of these hold; tell the user which issues qualified and why
the others didn't.

1. **No shared-schema surface.** The expected diff stays out of
   `apps/web/src/lib/db/schema.ts`, `apps/web/drizzle/`,
   `supabase/config.toml`, and dependency changes
   (`package.json` deps / `pnpm-lock.yaml`). Migrations collide by
   timestamp prefix and the schema is shared state; lockfile installs
   interfere via the shared store. These issues run serially, in the
   main checkout.
2. **No file overlap with the other candidates.** If two issues'
   expected diffs touch the same files, they merge-conflict by
   construction — serialize them (or batch them into one subagent).
3. **Self-contained spec.** If the issue has an open design decision
   that will need the user mid-implementation, don't fan it out:
   resolve the question with the user first, or keep that issue in
   this session where the user can steer. A subagent runs to
   completion and can only report back.
4. **Verifiable without the shared DB.** The subagent must be able to
   validate its work with lint/typecheck/targeted unit tests alone.
   Anything needing DB writes or a full build for verification stays
   serial.

Cap concurrency at **3 subagents**. The bottlenecks are the shared
DB, the serial verification step below, and the user's review
bandwidth — more fan-out does not ship faster.

## Step 2 — What every subagent prompt MUST contain

Constraints do not reach subagents unless written into their prompts.
Include, verbatim in substance:

- Run `pnpm install` before the first commit. Rationale: pnpm
  workspace links are relative, so the main checkout's node_modules
  must never be reused; and husky's hook dir (`.husky/_`) only exists
  after install — commits before that silently skip lint-staged.
- Never run `supabase start` / `supabase stop` / `supabase db reset`
  (the local stack is shared; `db reset` destroys the main
  checkout's dev data), never `pnpm build`, never `git stash`
  (`refs/stash` is shared across worktrees), never push.
- Tests: run only file-scoped tests for the code you touched
  (`pnpm --filter <pkg> exec vitest run <paths>`). NEVER run the full
  `apps/web` suite: its integration tests fall back to connecting to
  `127.0.0.1:54322` even without env vars and insert/delete fixed
  fixture ids in the shared DB — two concurrent runs collide.
  Full-suite verification is the coordinator's job (Step 3).
- Commit incrementally on the worktree's branch; report the branch
  name, a summary of the diff, and any judgment calls made.

## Step 3 — Coordinator duties after subagents return

- **Serial verification, one worktree at a time**: `pnpm lint`,
  `pnpm typecheck`, and the full test suites (`pnpm test`) — never
  two at once, for the DB and pooler reasons above. A single `pnpm
build` can eat nearly the whole ~97-slot local pooler budget by
  itself.
- Review each diff; relay the subagents' judgment calls and any
  failures to the user. Fix-ups can go back to the same subagent via
  SendMessage, or be done directly in its worktree.
- Merging the branches is the user's call, per the repo's git rules.
  After a branch merges, remove its worktree:
  `git worktree remove <path>` (never bare `rm -rf`; if that
  happened, `git worktree prune`). Worktrees grow their own `.next` /
  `.turbo`, so don't let them linger.

## Known limits (accepted, don't fight them)

- **Google OAuth only works on port 3000**: `additional_redirect_urls`
  is fixed in the tracked `config.toml`. In a worktree, verify flows
  with email/password login. Dev-server ports: web `PORT=3001`
  (then 3002, …; update `NEXT_PUBLIC_SITE_URL` in the copied
  `.env.local` to match), Expo `--port 8082` (then 8083, …).
- **Auth cookies are shared across localhost ports**
  (`sb-*-auth-token`): simultaneous logins to two worktrees in one
  browser overwrite each other. Use separate browser profiles.
- If `apps/web/engines/` is missing in a worktree (the symlink
  setting didn't apply), the web prebuild re-downloads the 46 MB
  Maia model — slow but harmless.
