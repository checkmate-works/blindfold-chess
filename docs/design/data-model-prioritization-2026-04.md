# ADR: Data Design Refinement Prioritization (post-VIEW-DROP world)

- **Date**: 2026-04-29
- **Status**: Proposed
- **Branch**: `feature/chunk-comments`
- **Author role**: System Architect
- **Scope**: prioritized roadmap for `post_game_attachments` data-model refinement after the Phase 0 compat-VIEW drop. Issues 2–8 from the Orchestrator's brief.

---

## Context

The chunk-comment game-attachment feature shipped in this branch via SPEC1 (Lichess URL + raw PGN) and the SPEC2 chess.com extension (manual-paste PGN + structured `(attribution_platform, attribution_path)` URL credit). The data model adopted **Pattern 5** from SPEC2/issue #72: per-kind extension tables hanging off `topic_posts` (1:0..1 via `UNIQUE(post_id)`). One kind table is implemented today — `post_game_attachments` (`apps/web/src/lib/db/schema/tables.ts:592-696`) — with three more issued but unimplemented (`#73 post_image_attachments`, `#74 post_fen_attachments`, `#75 post_video_attachments`).

The table carries six DB-level CHECK constraints, four explicit indexes, three RLS policies (`apps/web/drizzle/supabase/rls_policies.sql:459-517`), Lichess fetch-reuse (30-day TTL, `apps/web/src/lib/games/resolve-lichess-attachment.ts:16`), and chess.com manual-paste-only attribution (`apps/web/src/lib/games/chesscom-attribution.ts`, `validation.ts`). All tests pass; the rename and chess.com attribution were applied in 2026-04-27 / 2026-04-28 migrations. Phase 0 of the next session drops the transitional `topic_post_attachments` VIEW; this ADR addresses the world after that drop.

The goal here is decision-only: rank the seven candidate refinement issues, pick which belong in the current Shikigami session, which defer to a follow-up, which roll into Phase 2 (#73–#75), and which to reject. No migrations, no code, no schema changes are written by this document.

---

## Issue 2: Column naming and index composition review

### Current state

Column shape (`tables.ts:592-696`, raw SQL `apps/web/drizzle/20260427095052_create_topic_post_attachments.sql:1-29` and the chess.com migration `20260428093313_*:13-15`):

- `post_id uuid NOT NULL UNIQUE REFERENCES topic_posts(id) ON DELETE CASCADE`
- `source varchar(20) NOT NULL` — `'pgn' | 'lichess'`
- `source_url varchar(512)` — audit-only, never rendered
- `source_game_id varchar(64)` — Lichess gameId
- `pgn text NOT NULL` (CHECK: `octet_length(pgn) = pgn_byte_length`, `pgn_byte_length <= 102400`)
- `pgn_byte_length integer NOT NULL`
- `starting_fen varchar(100)`, `move_count integer DEFAULT 0`
- six denormalized PGN headers, all nullable
- `anonymized boolean DEFAULT false`
- `attribution_platform varchar(20)`, `attribution_path varchar(160)` (paired NULL-or-NOT-NULL)
- `created_at timestamptz DEFAULT now()`

Explicit indexes (raw SQL above):

1. `idx_post_game_attachments_post` on `(post_id)` — btree
2. `idx_post_game_attachments_source` on `(source)` — btree
3. `idx_post_game_attachments_size` on `(pgn_byte_length)` — btree
4. `idx_post_game_attachments_source_game` on `(source, source_game_id)` — btree

PLUS the implicit btree from the `UNIQUE(post_id)` constraint (`post_game_attachments_post_id_unique`, created automatically by Postgres).

Real query patterns observed:

| Caller                                  | Predicate                                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `get-attachments-for-posts.ts:54-56`    | `post_id IN (...)` + `JOIN topic_posts ON id` filtered by `deleted_at IS NULL`                            |
| `resolve-lichess-attachment.ts:50-60`   | `source='lichess' AND source_game_id=? AND created_at > now() - 30d ORDER BY created_at DESC LIMIT 1`     |
| RLS SELECT (`rls_policies.sql:467-475`) | `EXISTS(SELECT 1 FROM topic_posts p WHERE p.id = post_game_attachments.post_id AND p.deleted_at IS NULL)` |
| RLS INSERT/DELETE                       | same lookup by `post_id`                                                                                  |

### Problem(s)

1. **`idx_post_game_attachments_post` is fully redundant.** The `UNIQUE(post_id)` constraint already creates an implicit unique btree on `post_id`. A second non-unique btree on the same column is dead weight: it costs INSERT time and disk, and the planner picks the unique index for every `post_id IN (...)` lookup anyway. This is a straightforward cleanup. Source: migration `20260427095052_create_topic_post_attachments.sql:19,26`.
2. **`idx_post_game_attachments_source` (single-column on `source`) has near-zero discriminating value.** Today `source` has only two domain values (`'pgn'`, `'lichess'`); the cardinality is so low that any predicate on `source` alone will be either a sequential scan or a partial-bitmap that loses to the other indexes. The composite `idx_post_game_attachments_source_game` already covers `WHERE source='lichess' AND source_game_id=...` (the only real callsite). The standalone index would only help admin queries shaped like `SELECT * FROM post_game_attachments WHERE source='pgn'`, and even those are better served by a full-table scan at this row count.
3. **No covering index for the soft-delete-aware fetch.** The hottest read path is `get-attachments-for-posts.ts` which does `inArray(post_id) JOIN topic_posts deletedAt IS NULL`. The unique btree on `post_id` is sufficient for the seek, and the JOIN is to `topic_posts.id` (already PK). No covering index is needed here — the row is fetched once per post and the read is small. **Not a real gap.**
4. **`source` and `attribution_platform` are decoupled even though they're conceptually related.** `source='pgn'` may have `attribution_platform='chesscom'` (chess.com paste path) or NULL (raw paste). This is fine — the code in `createChunkPostWithAttachment.ts:163-184` handles it explicitly — but it's worth documenting why the two columns coexist. Naming-wise, no rename is justified: `attribution_platform` reads correctly and matches issue #72's terminology.
5. **Naming**: nothing reads wrong. `source` / `source_url` / `source_game_id` / `attribution_*` / `header_*` are all clear and align with the SPEC1 design. No rename recommended.

### Options

- **A. Drop the two redundant indexes only (`idx_..._post`, `idx_..._source`).** One migration, S effort.
- **B. Drop redundant indexes AND add a partial covering index for the Lichess reuse lookup** (e.g., `(source_game_id, created_at DESC) WHERE source='lichess'`). Marginal upside at current scale (rows are small, lookup uses the existing composite). M effort. Not worth it.
- **C. Do nothing.** Two unnecessary indexes remain; not catastrophic but they're a documented smell and future readers will repeat the analysis.

### Recommendation

**Option A.** Drop `idx_post_game_attachments_post` (redundant with `UNIQUE(post_id)`) and `idx_post_game_attachments_source` (low cardinality, dominated by the composite). Keep `idx_post_game_attachments_size` (admin/forensic filter, still serves its stated purpose) and `idx_post_game_attachments_source_game` (Lichess reuse, hot path). Names are otherwise correct.

### Phase: `now`

### Effort: S

### Dependencies: none

---

## Issue 3: Phase 2.5 generalization (`topic_type` extensibility)

### Current state

`post_game_attachments` joins `topic_posts` via `post_id` only. The `topicType` column lives on `topic_posts` (`tables.ts:416`) as a polymorphism discriminator — `'square' | 'opening' | 'chunk'` today, with `'square'` and `'opening'` already in production for non-attachment topics. **The attachment table itself contains no `topic_type` column** — by design, attachments are scoped per-post, and per-post visibility flows through the FK. The Server Action wrapper (`createChunkPostWithAttachment.ts`) hard-codes `topicType: 'chunk'` (`createChunkPostWithAttachment.ts:108`), which is a route-level concern, not a schema concern.

The schema does not gate attachments to `chunk` posts. Any post (regardless of `topic_type`) can hold an attachment if a Server Action chooses to create one. The only thing that's `chunk`-specific today is the **wrapper action** under `apps/web/src/app/[locale]/(public)/chunks/[slug]/_actions/`. The RLS policy is also topic-type-agnostic (`rls_policies.sql:467-501`) — it only checks `topic_posts.user_id = auth.uid()` and `deleted_at IS NULL`.

### Problem(s)

There is **no schema lock-in** preventing `topic_type='square'` or `'opening'` from receiving attachments. The 1:0..1 invariant (`UNIQUE(post_id)`) is also topic-type-independent. The work to "open up" attachments to other topic types is entirely at the Server Action layer:

- a `createSquarePostWithAttachment.ts` (or `createOpeningPostWithAttachment.ts`) wrapper following the same shape as the chunk variant
- whatever per-topic display routes need to show the attached game

These are application concerns, not data-model concerns. **The schema is already ready.**

One small forward-compatibility question: if a future feature wants per-topic-type attachment policies (e.g., "no attachments allowed on `'square'` posts"), the cleanest place to express that is in **RLS** by joining on `topic_posts.topic_type`, not by adding a discriminator to `post_game_attachments`. That would be a one-line predicate addition to the existing INSERT policy — no migration needed beyond the policy itself.

### Options

- **A. Do nothing.** Schema is already topic-type-agnostic. Document the position so the next session doesn't re-litigate it.
- **B. Add `topic_type varchar(50)` denormalized onto `post_game_attachments` (with a CHECK that it matches the parent `topic_posts.topic_type`).** This would let RLS / queries filter without a JOIN. **Rejected**: denormalization without a real query need, plus the CHECK requires a trigger (Postgres CHECK can't reference another table) — high cost, no upside.
- **C. Add a per-topic-type attachment-allowed bitmap on `topic_posts.topic_type`'s master configuration.** **Rejected**: there is no master configuration table for `topic_type` (it's a varchar discriminator), and inventing one for a feature that doesn't exist is YAGNI.

### Recommendation

**Option A — no schema change.** The Pattern 5 design already cleanly separates "what kind of attachment" (per-table) from "what kind of topic" (per-topic via `topic_posts.topic_type`). Generalizing to `'square'` / `'opening'` is a Server-Action-layer decision, not a data-model one. Recommend updating the `@design` TSDoc on the `postGameAttachments` table to explicitly state "topic-type-agnostic; gating happens at the Server Action / RLS layer" so this question isn't re-asked. That doc-only update can ride with Issue 2 in the same commit if convenient.

### Phase: `not-needed` (with a small `now` doc-comment ride-along)

### Effort: S (doc only)

### Dependencies: none

---

## Issue 4: Lichess reuse cache TTL (currently 30 days)

### Current state

`apps/web/src/lib/games/resolve-lichess-attachment.ts:16` defines `REUSE_WINDOW_DAYS = 30`. When a user attaches a Lichess URL, the resolver first checks `post_game_attachments` for any existing row with `source='lichess'` and the same `source_game_id` whose `created_at > now() - 30 days`; if found, the previously fetched PGN is reused without contacting Lichess. The window value was set per SPEC1 §6-1 (`docs/design/SPEC1-design.md:689`) explicitly as a balance between (a) catching upstream deletions sooner (shorter is better) and (b) reducing outbound load on Lichess (longer is better).

The design comment also notes: re-fetched on cache miss, `validateAttachedPgn` is re-applied even on cache hits (so the normalization is idempotent), and `anonymized` flagging is per-poster (the reused PGN is re-anonymized at write time if requested). The Lichess fetcher itself is rate-limited (30 req/min per process, `lichess.ts:35-37`) and has a 60 s cooldown on 429 responses.

### Problem(s)

- **30 days is plausible but unanchored to data.** No one has measured how often the same Lichess gameId is re-attached within 30 days vs. 60 vs. 7. Without that telemetry, picking 30 was an educated guess — and remains one.
- **Lichess game deletion is rare but real.** Players can request game export deletion; if a deleted game is in the cache, we serve a stale PGN beyond the upstream delete. 30 days is a reasonable upper bound, but it does mean a deleted game can persist in the cache for up to 30 days.
- **The TTL is hard-coded as a single module constant** — easy to change, but currently has no runtime override or observability hook. There is no existing metric counting `reused: true` vs `reused: false`.
- **At current MVP scale (chunk comments, low traffic), reuse is rare enough that the TTL likely has no observable cost-or-benefit either way.** The risk of getting it wrong is correspondingly small.

### Options

- **A. Keep 30 days.** Defensible default, matches SPEC1, no urgency.
- **B. Tighten to 7 days.** Catches upstream deletions faster, costs ~4× more outbound Lichess fetches per re-attached game, but at MVP scale the absolute number is tiny. Trade-off favors freshness.
- **C. Loosen to 90 days.** Reduces Lichess load further, but extends stale-PGN window for deleted games. Trade-off favors thrift.
- **D. Add a `lichess_reuse_count` counter in logs/metrics first, then revisit in 1–2 months once data is in.** Defensible "decide later" path.

### Recommendation

**Option A — keep 30 days, defer revisit.** The constant is in the right ballpark; with no observed pain in either direction, changing it now is bikeshedding. If we want to be slightly proactive, **Option D** (add a `console.info` or Sentry breadcrumb on cache hit/miss so we can grep later) is cheap, but I would not block this session on it. Recommend leaving the constant alone and adding a one-line `@todo` comment near it pointing at this ADR for the next reviewer.

### Phase: `not-needed`

### Effort: S (a comment, if anything)

### Dependencies: none

---

## Issue 5: `attribution_platform` future extensibility

### Current state

`attribution_platform varchar(20)` with CHECK `IN ('chesscom')` (`tables.ts:668-672`, migration `20260428093313_*:19-24`). Pair invariant via `chk_attribution_pair` ensures `attribution_platform` and `attribution_path` are NULL-together or NOT-NULL-together (`tables.ts:680-687`). The path regex `^/[A-Za-z0-9/_-]{1,128}$` (`tables.ts:676-679`) is generic over URL pathnames, not chess.com-specific.

The Server Action accepts only `kind: 'chesscom_attribution'` from `detectAttachmentInput` (`validation.ts:67-78`), and the parser is hostname-pinned to `www.chess.com` (`chesscom-attribution.ts:60`). The `@design` TSDoc on the table (`tables.ts:631-634`) explicitly says "currently 'chesscom' only — additional platforms are added by extending this CHECK + the parser."

### Problem(s)

- **The `IN ('chesscom')` CHECK is the lock-in point.** Adding a third platform (e.g., `'lichess4545'`, `'fide'`, `'eu_chess'`) requires a one-line migration: `ALTER TABLE ... DROP CONSTRAINT chk_attribution_platform_valid; ADD CONSTRAINT ... IN ('chesscom', 'newplatform');`. That's `S` effort, not painful.
- **Per-platform path validation differs.** The current path regex is generic — chess.com path safety is enforced both at the regex AND at the parser (hostname allow-list, userinfo rejection, https-only). A new platform might have totally different path shapes (e.g., a numeric-only ID, a UUID, etc.). Either:
  - the regex stays generic and per-platform path validation is delegated to the parser (current de-facto setup), OR
  - a per-platform path-format CHECK is added (would require partial CHECKs by `attribution_platform`, doable but adds complexity).
- **The renderer rebuilds the URL from `(platform, path)` server-side.** A new platform requires a corresponding renderer arm in `AttachedGameCard.tsx` — that's an application change, not a schema change.
- **No design margin to add now is obvious.** The decomposed `(platform, path)` storage already gives us all the flexibility we need; expanding the allow-list is trivial when the time comes.

### Options

- **A. Do nothing now.** The path forward is documented and the CHECK is already a one-line migration when needed.
- **B. Pre-extend the CHECK with placeholder values (e.g., `IN ('chesscom', 'lichess', 'fide')`).** **Rejected**: adds values that have no parser, no renderer, and no test coverage. Worse than nothing.
- **C. Replace the CHECK with a master `attribution_platforms` table referenced via FK.** **Rejected**: massive overkill for an enum of size 1–3, plus FK-checking on every INSERT for a static set is wasteful. The varchar+CHECK pattern is consistent with the rest of the codebase (`topic_type`, `target_type`, `action`, `provider`, etc., all varchar+CHECK or varchar+app-validate).

### Recommendation

**Option A.** The current `(platform, path)` decomposition already provides the design margin. Adding a third platform is a 3-step change documented in the migration template (CHECK + parser + renderer). Document this explicitly in the `@design` TSDoc next to the constraint to set expectation for the next maintainer. Doc-only — can ride with Issue 2.

### Phase: `not-needed` (with a doc-comment ride-along on Issue 2)

### Effort: S (doc only)

### Dependencies: none

---

## Issue 6: `pgn_byte_length` upper bound (currently 100 KB)

### Current state

`chk_pgn_byte_length CHECK (pgn_byte_length > 0 AND pgn_byte_length <= 102400)` (`tables.ts:640-643`). Combined with `chk_pgn_byte_length_matches_octet_length` (`tables.ts:660-667`) which pins `pgn_byte_length = octet_length(pgn)` — so the cap is enforced against the actual byte length of the column, not a writer-supplied integer. Lichess fetcher also caps at 102 400 bytes (`lichess.ts:33`) so over-sized upstream responses are aborted before reaching the DB.

The 100 KB number was set per SPEC1 §H ("max PGN size 100KB"). For context:

- A typical 30-move blitz PGN is ~500 bytes.
- A 100-move classical game with full headers is ~3–5 KB.
- An annotated long game with NAGs and variations can run 10–30 KB.
- Correspondence games (200+ moves with extensive comments and variations) are the realistic worst case — published correspondence games occasionally exceed 50 KB.
- 100 KB safely accommodates correspondence games with annotations; the Lichess game-export endpoint itself rarely exceeds ~30 KB even for long annotated games.

### Problem(s)

- **100 KB is generous for the current scope** (chunk comments are training-tactic discussions; users are mostly attaching their own short games or interesting blitz games). I would not expect to see > 50 KB attachments in practice.
- **There is one realistic-but-unusual edge case**: a serious correspondence-game enthusiast pastes a heavily-annotated ICCF correspondence game with deep variation trees. Those can sneak above 50 KB; 100 KB still accommodates them comfortably.
- **No reported pain.** Tests pass; no user has hit the cap.
- **The cap also bounds memory cost of `parsePgnWithFen` on the read path** (`get-attachments-for-posts.ts:67`), so raising it has a memory-pressure consequence on high-fanout pages.

### Options

- **A. Keep 100 KB.** Defensible, no observed problem.
- **B. Tighten to 50 KB.** Reduces memory cost on read by half, but cuts off edge correspondence games. **Rejected**: not worth the regression for a class of users (correspondence-game annotators) who would feel cut off.
- **C. Loosen to 256 KB.** Accommodates extreme correspondence + annotation cases. **Rejected**: no demonstrated need; raises memory pressure on the read path; harder to argue the upper bound is "reasonable" if questioned.
- **D. Add an admin-tunable per-attachment cap stored in a config table.** **Rejected**: massive overkill.

### Recommendation

**Option A — keep 100 KB.** It accommodates realistic chess PGN sizes including annotated correspondence games with comfortable margin, and it's the same number Lichess itself caps the fetch at. No change.

### Phase: `not-needed`

### Effort: S (no change)

### Dependencies: none

---

## Issue 7: Soft-delete behavior for attachment rows

### Current state

`post_game_attachments` has **no `deleted_at` column** of its own. When the parent `topic_posts` is soft-deleted (`deleted_at IS NOT NULL`), the attachment row physically persists. Visibility is gated by:

1. **Application layer**: `get-attachments-for-posts.ts:55-56` joins `topic_posts` and filters `deleted_at IS NULL`.
2. **RLS SELECT policy**: `rls_policies.sql:467-475` enforces the same predicate at the DB level (defense-in-depth).
3. **CASCADE on hard delete**: `topicPosts.id` FK has `ON DELETE CASCADE` (`tables.ts:599`), so a hard `DELETE FROM topic_posts` reaps the attachment too.

The RLS comment block (`rls_policies.sql:476-486`) explicitly justifies why DB-level enforcement is stricter than the parent's RLS: attachments carry full PGN, original player names, and source URLs — markedly more sensitive than the post text — so a future REST-API client or debug tool that forgets the `deleted_at` filter cannot accidentally re-expose orphaned attachments.

### Problem(s)

1. **Storage cost grows with soft-deleted posts.** Soft-delete is ~free for `topic_posts.content` (text), but `post_game_attachments.pgn` is up to 100 KB per row. 1 000 soft-deleted attached posts ≈ up to 100 MB of unrecoverable PGN. At MVP scale this is irrelevant; at scale it's still small (bytes, not GB).
2. **GDPR / data-deletion requests** become slightly trickier. If a user requests deletion of their data, the operator must hard-delete `topic_posts` (CASCADE reaps the attachment), not just soft-delete. This is the standard pattern across the codebase already (see `mypage` deletion flows) — but it's worth being explicit that for **attachment-bearing posts**, soft-delete is **not** sufficient for a "right to be forgotten" request.
3. **Header rows preserve player names.** `header_white` / `header_black` may carry real-name-equivalent data. The `anonymized` flag clears these at write time when the user opted in, but rows with `anonymized=false` retain identifying data forever (until parent hard-delete).
4. **No reaper / TTL for soft-deleted attachments.** There is no scheduled job that hard-deletes attachments whose parent has been soft-deleted for > N days. The Phase 2 image attachment work (#73) explicitly adopts a Storage reaper — the analog for game attachments would be a SQL reaper that hard-deletes parent posts (or just the attachment rows) after a quiet period.
5. **The current RLS-only soft-hide is acceptable for MVP and for the chunk-comments scope.** None of the above hurts now.

### Options

- **A. Do nothing.** Current behavior is correct, defensible, and tested. The known-but-not-yet-painful storage and GDPR concerns are reasonable to defer.
- **B. Add a `post_game_attachments.deleted_at` column** (mirror parent's). **Rejected**: redundant with parent's `deleted_at` (always co-derivable), adds RLS complexity, no caller asked for it.
- **C. Add a scheduled SQL reaper that hard-deletes rows whose parent has been soft-deleted for > 90 days.** Worth doing eventually; tied to a broader retention/cleanup policy that doesn't exist yet. Defer.
- **D. Document GDPR posture in the schema TSDoc** so future reviewers / compliance reads know that attachment-bearing posts must be hard-deleted (not soft-deleted) on user data-deletion requests. Cheap, valuable.

### Recommendation

**Option A + D combined.** Keep the current soft-hide-via-RLS behavior — it is correct and well-defended. Add a 3–5-line TSDoc note on the table explaining that (i) soft-deletion preserves the row, (ii) header columns may carry identifying data, (iii) hard-delete (or future reaper) is required for full data removal. This is doc-only and can ride with Issue 2 / Issue 3 / Issue 5 in a single comment-update commit.

A SQL reaper (Option C) is a real future need but is **not blocked by anything**, has no schema dependency, can be added orthogonally any time, and bundling it with this session inflates scope. Recommend `next-session` for the reaper proposal.

### Phase: `now` (doc only) + `next-session` (reaper proposal)

### Effort: S (doc) / M (reaper, when it happens)

### Dependencies: none

### Open question for Orchestrator

Is there a current GDPR / data-retention SLA (e.g., "user-requested deletions must purge all PII within X days")? If yes, the reaper jumps in priority. If no formal SLA exists, the doc-only path is sufficient for now.

---

## Issue 8: Re-evaluation of unimplemented sub-issues #73, #74, #75

### Current state

Three Pattern 5 kind tables are issued but unimplemented:

- **#73 `post_image_attachments`** — Supabase Storage `post-images` bucket (public + reaper), 1:N with per-post cap of 3, magic-byte validation, EXIF GPS strip via Sharp, decompression-bomb defense via `width × height ≤ 50 MP`, BEFORE INSERT trigger + denormalized counter for race-free per-post limit, hard SVG rejection, no `public_url` column (rebuild from `storage_path`).
- **#74 `post_fen_attachments`** — 1:0..1, single FEN string with strict regex CHECK at DB + chess-core semantic validation at app, optional `caption` with bidi/zero-width sanitization.
- **#75 `post_video_attachments`** — 1:0..1 YouTube only for MVP, 11-char `provider_video_id` validated at DB, iframe sandbox + `youtube-nocookie.com`, render-time src reconstruction (never `source_url` directly), oEmbed deferred.

All three issues were drafted before the chess.com attribution work landed and before Phase 0 dropped the compat VIEW. They were also drafted as a coherent SPEC2 batch driven by the "image bloat / NULL bloat" critique that motivated Pattern 5 in the first place.

### Problem(s)

- **The three issues do not interact with `post_game_attachments` in any blocking way.** Each is a fully independent kind table hanging off `topic_posts.id`. None reference, JOIN to, or modify `post_game_attachments` schema. They can be scheduled when product priority demands them.
- **Are they still the right design? Mostly yes, with two small revisions worth surfacing now:**
  1. **#75 `provider` column allow-list pattern is identical to `attribution_platform` (Issue 5).** The same "varchar + CHECK + parser + renderer + path validation regex" pattern applies. The issue draft already lines this up correctly. No revision needed beyond consistency naming.

  2. **#74 FEN regex CHECK** (`^[rnbqkpRNBQKP1-8/]+ [wb] (-|[KQkqA-Ha-h]+) (-|[a-h][1-8]) [0-9]+ [0-9]+$`) is the same shape used elsewhere in the codebase. Looks correct on inspection — but worth confirming against `chess-core`'s `validateFen` (and `validateFenStructure` referenced in `lib/chunks/validation.ts`) to make sure the DB regex is **strictly looser** than chess-core's semantic check (so chess-core is the authoritative gate; the regex is a coarse first line). The issue draft already says this in prose; the implementation just needs to verify it.

  3. **#73 per-post image cap of 3 enforced via BEFORE INSERT trigger + denormalized counter on `topic_posts.image_attachment_count`** is sound. **One point to flag**: the trigger acquires `FOR UPDATE` on `topic_posts`, which serializes inserts on the parent post row. This is fine for image uploads (low concurrency per post) but is worth being explicit that this trigger holds a parent-row lock for the duration of the INSERT transaction, which interacts with the parent post's other update paths (counters, etc.). At MVP this won't bite; at scale it's a known-and-documented constraint.

  4. **#73 Phase 2 plan to migrate from public bucket + reaper to private bucket + signed URL proxy** is the right call. The issue draft accepts a max-7-day visibility window for soft-deleted images; this matches the soft-delete posture in Issue 7 and is internally consistent.

- **None of the three issues block the current session.** All three are `phase-2` work, gated on product priority for image / FEN / video attachments respectively.

### Options

- **A. Leave the three issues as drafted.** Implementation can begin whenever product priority demands.
- **B. Merge #74 (FEN) into the current session as a smaller win** — FEN is the simplest of the three (one regex, one column, no Storage). **Rejected**: no product driver this session asked for FEN; pulling it in is scope creep.
- **C. Re-scope #75 to also support Vimeo, Twitch, etc.** **Rejected**: YAGNI — MVP is YouTube only per the issue, and the schema as-drafted (varchar `provider` + CHECK) extends cleanly when the time comes. Same pattern as Issue 5.
- **D. Update #74 / #75 issue bodies with a one-paragraph "post-VIEW-DROP / post-chess.com world" reconciliation note** so the next implementer doesn't have to mentally diff the world state. Cheap and useful.

### Recommendation

**Option A + D combined.** The three issues remain the right design. Add a short reconciliation comment to each GitHub issue (1 paragraph each) noting:

- the SPEC1/SPEC2 game-attachment work is complete
- compat VIEW is dropped (Phase 0)
- the `attribution_platform` pattern is the precedent for `#75 provider`
- the soft-delete posture (Issue 7) sets the floor for #73's reaper window

This is GitHub-only, not code, and keeps the issues fresh without committing implementation effort.

### Phase: `phase-2` (implementation) + `next-session` (issue body refresh)

### Effort: L (each, when implemented) / S (issue refresh)

### Dependencies: none for the schema itself; `#73` depends on Sharp dependency (already approved per Q2 in #72)

---

## Recommended execution order for `now` items

1. **Issue 2 (drop redundant indexes) + ride-along TSDoc updates from Issues 3, 5, 7** — single migration + single doc commit. Order: doc first (commit 1, no migration), then migration (commit 2). Doc update touches the `@design` block on `postGameAttachments` to cover (a) topic-type-agnostic positioning [Issue 3], (b) `attribution_platform` extensibility pattern [Issue 5], (c) soft-delete posture and GDPR note [Issue 7]. The migration drops `idx_post_game_attachments_post` and `idx_post_game_attachments_source`.

   _Rationale for this order_: doc updates are zero-risk and bring readers up to speed before the migration changes the index set. The migration itself is `DROP INDEX IF EXISTS` × 2 — minimal risk, easily reversible.

2. (No further `now` items.)

The `now` slate is intentionally short: only Issue 2 has a real schema delta worth doing this session. Issues 3, 5, 7 are doc-only ride-alongs. Issues 4, 6 are explicit no-ops. Issue 8 is `phase-2`.

---

## Open questions for the Orchestrator

1. **Issue 7 — GDPR / data-retention SLA**: Is there a current product-level commitment about how fast user-requested deletions must purge all PII (including attachment headers like `header_white`)? If yes, a SQL reaper for soft-deleted attachments rises in priority and should land `next-session` rather than later. If no formal SLA, the doc-only path is sufficient.

2. **Issue 4 — Lichess reuse cache observability**: Would you like a one-line `console.info` / breadcrumb on cache hit/miss added now (cheap, gives us data for the next revisit), or defer that with everything else? Default recommendation: defer; the constant has no observed pain.

3. **Issue 8 — issue body refresh ownership**: Is the GitHub issue refresh (a 1-paragraph reconciliation note added to #73, #74, #75) something you want included in this session's deliverables, or handed off to a separate documentation pass? It's a 5-minute task either way, but I'm flagging it because it's outside the schema-design boundary the brief specified.
