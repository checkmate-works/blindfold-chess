# Account Erasure Request Runbook (GDPR / 個人情報保護法)

Manual operator procedure for a **full erasure request** — a data subject (or a
regulator on their behalf) asking that their content be _deleted_, not merely
anonymised. There is intentionally **no self-service UI** for this; it is a
low-frequency manual operation performed by an operator with service-role DB
access.

## Default policy (what happens without an erasure request)

The normal account-deletion lifecycle (documented in
`apps/web/src/lib/users/delete-account.ts`) is:

1. **退会 (soft delete)** — PII on `profiles` is anonymised, the avatar file is
   removed, Stripe is canceled, and likes the user _received_ are deleted. The
   user's **public content is kept** (games, chunks, topic_posts, positions,
   repertoires, game_comments); only the authorship is anonymised.
2. **Physical purge** (after `ACCOUNT_PURGE_RETENTION_DAYS`, default 30) — the
   `auth.users` row is hard-deleted. Private data is removed via FK CASCADE;
   public content survives with `user_id = NULL` ("(deleted user)"), and likes
   the user _gave_ survive anonymised.

So by default a user's public posts/positions/games **remain on the site
indefinitely, anonymised**. A full erasure request is the manual override that
also removes that retained public content.

> **ToS / legal note (product + legal task, not code):** the Terms of Service
> must state that _"posts may remain on the site in anonymised form after
> account deletion."_ Track this as a separate product/legal task — it is not
> handled in code. This runbook is the manual remedy for users who object.

## ⚠️ Timing: act during the retention window if possible

Identifying a specific user's content is only easy **while `user_id` still links
it to them** — i.e. during the soft-delete retention window, before the physical
purge sets `user_id = NULL`. Once an account has been purged, the content is
anonymised and **can no longer be found by `user_id`**; you must then rely on
URLs / content ids the requester provides.

If an erasure request arrives for a not-yet-purged account, run this procedure
**before** the purge cron reaches it (or temporarily exclude them).

## Procedure

All steps run as **service role** (bypasses RLS). Use the Supabase SQL editor or
a `psql` session against the production DB. Substitute `:uid` with the target
`auth.users.id` (or `profiles.id` — same value).

### 1. Inventory the user's content

```sql
SELECT 'topic_posts' AS table, count(*) FROM public.topic_posts WHERE user_id = :uid
UNION ALL SELECT 'positions',     count(*) FROM public.positions      WHERE user_id = :uid
UNION ALL SELECT 'chunks',        count(*) FROM public.chunks         WHERE user_id = :uid
UNION ALL SELECT 'repertoires',   count(*) FROM public.repertoires    WHERE user_id = :uid
UNION ALL SELECT 'games',         count(*) FROM public.games          WHERE author_id = :uid
UNION ALL SELECT 'game_comments', count(*) FROM public.game_comments  WHERE author_id = :uid;
```

(If the account is already purged, the requester must supply the specific URLs /
ids; query by `id` instead of `user_id`.)

### 2. Collect Storage paths BEFORE deleting the DB rows

Post-image attachments live in the `post-images` bucket; their keys are stored
on `post_image_attachments.storage_path`. Capture them first — once the rows are
gone you cannot recover the keys:

```sql
SELECT pia.storage_path
FROM public.post_image_attachments pia
JOIN public.topic_posts tp ON tp.id = pia.post_id
WHERE tp.user_id = :uid;
```

The avatar file (`avatars/${uid}/...`) was already removed at退会 by
`deleteAccount` (`apps/web/src/lib/users/delete-account.ts`); no action needed
unless verifying.

### 3. Delete the content rows

Deleting the parent rows cascades to their children (attachments, ratings,
repertoire chapters/lines, etc. — all `ON DELETE CASCADE` to their parent). Run
inside a transaction so it is all-or-nothing:

```sql
BEGIN;
DELETE FROM public.topic_posts  WHERE user_id   = :uid; -- cascades attachments, ratings
DELETE FROM public.positions    WHERE user_id   = :uid; -- cascades position_chunks/themes, edit_requests
DELETE FROM public.chunks       WHERE user_id   = :uid; -- NOTE: see chunk caveat below
DELETE FROM public.repertoires  WHERE user_id   = :uid; -- cascades chapters/lines/annotations
DELETE FROM public.games        WHERE author_id = :uid; -- cascades game_tokens, game_comments, game_chunks
DELETE FROM public.game_comments WHERE author_id = :uid; -- standalone comments on others' games
COMMIT;
```

> **`chunks` caveat:** `position_chunks.chunk_id` is `ON DELETE RESTRICT`, so a
> chunk referenced by a position cannot be deleted until those junction rows are
> removed. If the `chunks` delete errors, first
> `DELETE FROM public.position_chunks WHERE chunk_id IN (SELECT id FROM public.chunks WHERE user_id = :uid);`
> then retry. Weigh this against keeping the chunk anonymised — community chunks
> may be referenced by other users' positions.

### 4. Delete the Storage objects

Using the keys captured in step 2, remove them from the `post-images` bucket via
the Supabase Storage admin API / dashboard, e.g.:

```ts
await adminClient.storage.from('post-images').remove(storagePaths);
```

### 5. (If not yet purged) finalise the account

If the account had not yet been physically purged, let the normal purge cron
remove the `auth.users` row on schedule, or trigger it manually
(`auth.admin.deleteUser(uid)` — hard). The CASCADE/SET-NULL FKs then clean up the
remaining private data; the public content you deleted above will already be
gone.

## What is intentionally NOT erased

- **Append-only ledgers** (`point_events`, `exp_events`) are private data removed
  by FK CASCADE at purge; they are never surfaced publicly and are not separately
  pursued.
- **Moderation audit** (`moderation_actions`) — retained per the moderation
  policy; out of scope for a content-erasure request.
