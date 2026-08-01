-- Foreign Keys and Grants
-- This file configures FK constraints (to auth.users) and table-level
-- permissions for all tables that reference Supabase Auth.
--
-- This file is automatically applied by scripts/migrate.ts on Supabase environments.
-- It requires Supabase-managed roles (supabase_auth_admin, authenticated, anon)
-- and will fail on local PostgreSQL — this is intentional.

-- =============================================================================
-- Helper: idempotent FK to auth.users(id)
-- =============================================================================
-- Almost every user-owned table carries a single FK to auth.users(id) that
-- differs only by (table, constraint, column, ON DELETE action). This helper
-- collapses ~40 near-identical DO blocks into one call each.
--
-- Self-healing and idempotent: it no-ops when the constraint already exists
-- with the desired ON DELETE action, and otherwise (re)creates it. So a policy
-- change (e.g. CASCADE → SET NULL) is applied on the next migrate run with no
-- manual DROP, while an unchanged FK is left untouched (no needless
-- re-validation / locking on every deploy). The action keyword is mapped to a
-- vetted `confdeltype` code first, so only a known keyword ever reaches the
-- dynamic ALTER (no injection surface). Tables whose FK is NOT a plain
-- auth.users(id) reference (self-references, ON UPDATE actions) keep their own
-- explicit block below.
CREATE OR REPLACE FUNCTION public.ensure_auth_users_fk(
  p_table text,
  p_constraint text,
  p_column text,
  p_on_delete text
) RETURNS void
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_want text;
  v_have text;
BEGIN
  v_want := CASE upper(p_on_delete)
    WHEN 'CASCADE'   THEN 'c'
    WHEN 'SET NULL'  THEN 'n'
    WHEN 'RESTRICT'  THEN 'r'
    WHEN 'NO ACTION' THEN 'a'
    ELSE NULL
  END;
  IF v_want IS NULL THEN
    RAISE EXCEPTION 'ensure_auth_users_fk: unsupported ON DELETE action %', p_on_delete;
  END IF;

  SELECT confdeltype::text INTO v_have
  FROM pg_constraint
  WHERE conname = p_constraint
    AND conrelid = format('public.%I', p_table)::regclass;

  IF v_have IS NOT DISTINCT FROM v_want THEN
    RETURN; -- already present with the desired action
  END IF;

  IF v_have IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', p_table, p_constraint);
  END IF;

  EXECUTE format(
    'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE %s',
    p_table, p_constraint, p_column, upper(p_on_delete)
  );
END;
$fn$;

-- =============================================================================
-- profiles
-- =============================================================================

-- Cleanup: remove legacy trigger and function (moved to app layer)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- FK constraint: profiles.id → auth.users(id) ON DELETE CASCADE
--
-- CASCADE so the controlled physical purge (SPEC5: the
-- `purge-deleted-accounts` cron → `auth.admin.deleteUser(id)` *hard* delete)
-- can remove the auth.users row and have the profile go with it, which in turn
-- lets every other user-data FK fire (CASCADE for private data, SET NULL for
-- public content). This was previously RESTRICT, which *blocked* the hard
-- delete outright (the profile row kept auth.users pinned), so the purge could
-- never fire the cascade the policy depends on.
--
-- This is safe because the ONLY hard-delete path is the retention-gated purge
-- cron; the退会 (account-deletion) flow uses `deleteUser(id, true)` (soft), which
-- never removes the auth.users row and so never triggers this cascade. The
-- username/bannedAt ban-evasion hold therefore lasts for the whole soft-delete
-- retention window and is released only when the account is finally purged.
SELECT public.ensure_auth_users_fk('profiles', 'profiles_id_fkey', 'id', 'CASCADE');

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon;

-- =============================================================================
-- topic_posts
-- =============================================================================

-- FK constraint: topic_posts.user_id → auth.users(id) ON DELETE SET NULL
-- Public forum content: an author's physical purge anonymises the post
-- (user_id → NULL, rendered "(deleted user)") rather than cascading the thread
-- away. Mirrors games.author_id / chunks.user_id.
SELECT public.ensure_auth_users_fk('topic_posts', 'topic_posts_user_id_fkey', 'user_id', 'SET NULL');

-- FK constraint: topic_posts.parent_id → topic_posts(id) (self-reference for replies)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'topic_posts_parent_id_fkey'
  ) THEN
    ALTER TABLE public.topic_posts
      ADD CONSTRAINT topic_posts_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES public.topic_posts(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions
-- UPDATE matches the "topic_posts_update" RLS policy (own rows only): post
-- editing exists (editPost soft-edits, delete-core soft-deletes), so the
-- PostgREST surface mirrors what the app's privileged connection allows.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.topic_posts TO authenticated;
GRANT SELECT ON TABLE public.topic_posts TO anon;

-- =============================================================================
-- moderation_actions
-- =============================================================================

-- FK constraint: moderation_actions.actor_id → auth.users(id)
SELECT public.ensure_auth_users_fk('moderation_actions', 'moderation_actions_actor_id_fkey', 'actor_id', 'CASCADE');

-- Grant necessary permissions
GRANT SELECT, INSERT ON TABLE public.moderation_actions TO authenticated;

-- =============================================================================
-- user_follows & user_blocks
-- =============================================================================

-- FK constraint: user_follows.follower_id → auth.users(id)
SELECT public.ensure_auth_users_fk('user_follows', 'user_follows_follower_id_fkey', 'follower_id', 'CASCADE');

-- FK constraint: user_follows.following_id → auth.users(id)
SELECT public.ensure_auth_users_fk('user_follows', 'user_follows_following_id_fkey', 'following_id', 'CASCADE');

-- FK constraint: user_blocks.blocker_id → auth.users(id)
SELECT public.ensure_auth_users_fk('user_blocks', 'user_blocks_blocker_id_fkey', 'blocker_id', 'CASCADE');

-- FK constraint: user_blocks.blocked_id → auth.users(id)
SELECT public.ensure_auth_users_fk('user_blocks', 'user_blocks_blocked_id_fkey', 'blocked_id', 'CASCADE');

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON TABLE public.user_follows TO authenticated;
GRANT SELECT ON TABLE public.user_follows TO anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.user_blocks TO authenticated;

-- =============================================================================
-- notifications
-- =============================================================================

-- FK constraint: notifications.user_id → auth.users(id) ON DELETE CASCADE
SELECT public.ensure_auth_users_fk('notifications', 'notifications_user_id_fkey', 'user_id', 'CASCADE');

-- FK constraint: notifications.actor_id → auth.users(id) ON DELETE SET NULL
SELECT public.ensure_auth_users_fk('notifications', 'notifications_actor_id_fkey', 'actor_id', 'SET NULL');

-- Grant necessary permissions (no INSERT — controlled by server-side only)
GRANT SELECT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;

-- =============================================================================
-- notification_mutes
-- =============================================================================

-- FK constraint: notification_mutes.user_id → auth.users(id) ON DELETE CASCADE
SELECT public.ensure_auth_users_fk('notification_mutes', 'notification_mutes_user_id_fkey', 'user_id', 'CASCADE');

-- Grant necessary permissions (users manage their own mute rows directly, like user_follows)
GRANT SELECT, INSERT, DELETE ON TABLE public.notification_mutes TO authenticated;

-- =============================================================================
-- rate_limit_events
-- =============================================================================

-- FK constraint: rate_limit_events.user_id → auth.users(id) ON DELETE CASCADE
SELECT public.ensure_auth_users_fk('rate_limit_events', 'rate_limit_events_user_id_fkey', 'user_id', 'CASCADE');

-- Server-side only writes; revoke any client-role grants (RLS deny-by-default).
REVOKE ALL ON TABLE public.rate_limit_events FROM authenticated, anon;

-- =============================================================================
-- rate_limit_key_events
-- =============================================================================

-- No FK: subject_key is a free-form namespaced string (e.g. "ip:1.2.3.4",
-- "email:<sha256>"). Writes are server-side only via Drizzle (pooler role,
-- BYPASSRLS). Clients must never touch this table.
REVOKE ALL ON TABLE public.rate_limit_key_events FROM authenticated, anon;

-- =============================================================================
-- user_activity_log
-- =============================================================================

-- FK constraint: user_activity_log.user_id → auth.users(id) ON DELETE CASCADE
SELECT public.ensure_auth_users_fk('user_activity_log', 'user_activity_log_user_id_fkey', 'user_id', 'CASCADE');

-- Grant necessary permissions
GRANT SELECT, INSERT ON TABLE public.user_activity_log TO authenticated;

-- =============================================================================
-- user_roles
-- =============================================================================

-- FK constraint: user_roles.user_id → auth.users(id) ON DELETE CASCADE
SELECT public.ensure_auth_users_fk('user_roles', 'user_roles_user_id_fkey', 'user_id', 'CASCADE');

-- Server-side only access; custom_access_token_hook reads via supabase_auth_admin
-- (granted in custom_access_token_hook.sql). Revoke any client-role grants.
REVOKE ALL ON TABLE public.user_roles FROM authenticated, anon;

-- =============================================================================
-- chess_openings (master data — no FK to auth.users, public read)
-- =============================================================================

-- FK constraint: chess_openings.parent_slug → chess_openings(slug) (self-reference for tree)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_chess_openings_parent_slug'
  ) THEN
    ALTER TABLE public.chess_openings
      ADD CONSTRAINT fk_chess_openings_parent_slug
      FOREIGN KEY (parent_slug) REFERENCES public.chess_openings(slug)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END;
$$;

-- Grant read permissions (master data is publicly readable)
GRANT SELECT ON TABLE public.chess_openings TO authenticated;
GRANT SELECT ON TABLE public.chess_openings TO anon;

-- =============================================================================
-- likes (polymorphic, renamed from topic_post_likes)
-- =============================================================================

-- Drop the legacy FK constraint name if it survived the table rename. The
-- rename + recreate migration drops this in SQL, but we defensively drop here
-- as well so re-runs against older snapshots stay idempotent.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'topic_post_likes_user_id_fkey'
  ) THEN
    ALTER TABLE public.likes DROP CONSTRAINT topic_post_likes_user_id_fkey;
  END IF;
END;
$$;

-- FK constraint: likes.user_id → auth.users(id) ON DELETE SET NULL
-- A *given* like must survive its author's deletion (anonymised), not cascade
-- away — so when auth.users is physically purged (SPEC5) the like is kept with
-- user_id = NULL and still counts toward the liked content's total.
SELECT public.ensure_auth_users_fk('likes', 'likes_user_id_fkey', 'user_id', 'SET NULL');

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON TABLE public.likes TO authenticated;
GRANT SELECT ON TABLE public.likes TO anon;

-- =============================================================================
-- challenge_results
-- =============================================================================

-- FK constraint: challenge_results.user_id → auth.users(id) ON DELETE CASCADE
SELECT public.ensure_auth_users_fk('challenge_results', 'challenge_results_user_id_fkey', 'user_id', 'CASCADE');

-- Grant necessary permissions (public read for leaderboard display)
GRANT SELECT, INSERT ON TABLE public.challenge_results TO authenticated;
GRANT SELECT ON TABLE public.challenge_results TO anon;

-- =============================================================================
-- challenge_best_scores
-- =============================================================================

-- FK constraint: challenge_best_scores.user_id → auth.users(id) ON DELETE CASCADE
SELECT public.ensure_auth_users_fk('challenge_best_scores', 'challenge_best_scores_user_id_fkey', 'user_id', 'CASCADE');

-- Grant necessary permissions (public read for leaderboard display, UPDATE for UPSERT)
GRANT SELECT, INSERT, UPDATE ON TABLE public.challenge_best_scores TO authenticated;
GRANT SELECT ON TABLE public.challenge_best_scores TO anon;

-- =============================================================================
-- feed_items
-- =============================================================================

-- FK constraint: feed_items.actor_id → auth.users(id) ON DELETE CASCADE
SELECT public.ensure_auth_users_fk('feed_items', 'feed_items_actor_id_fkey', 'actor_id', 'CASCADE');

-- Grant necessary permissions (public read for timeline, server-side INSERT)
GRANT SELECT, INSERT ON TABLE public.feed_items TO authenticated;
GRANT SELECT ON TABLE public.feed_items TO anon;

-- =============================================================================
-- stripe_customers
-- =============================================================================

-- FK constraint: stripe_customers.user_id -> auth.users(id)
SELECT public.ensure_auth_users_fk('stripe_customers', 'stripe_customers_user_id_fkey', 'user_id', 'CASCADE');

-- Server-side only writes (no INSERT/UPDATE for authenticated)
GRANT SELECT ON TABLE public.stripe_customers TO authenticated;

-- =============================================================================
-- subscriptions
-- =============================================================================

-- FK constraint: subscriptions.user_id -> auth.users(id)
SELECT public.ensure_auth_users_fk('subscriptions', 'subscriptions_user_id_fkey', 'user_id', 'CASCADE');

-- Users can read their own subscriptions; writes are server-side only
GRANT SELECT ON TABLE public.subscriptions TO authenticated;

-- =============================================================================
-- user_interview_answers
-- =============================================================================

-- FK constraint: user_interview_answers.user_id → auth.users(id) ON DELETE SET NULL
-- Answers are kept as anonymous aggregate statistics: an author's physical purge
-- anonymises the row (user_id → NULL) rather than cascading it away. Per-user
-- reads filter by the live caller's id, so anonymised rows never surface.
SELECT public.ensure_auth_users_fk('user_interview_answers', 'user_interview_answers_user_id_fkey', 'user_id', 'SET NULL');

-- Grant necessary permissions (public read, authenticated insert/delete)
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_interview_answers TO authenticated;
GRANT SELECT ON TABLE public.user_interview_answers TO anon;

-- =============================================================================
-- ranks
-- =============================================================================

-- Grant read permissions (master data is publicly readable)
GRANT SELECT ON TABLE public.ranks TO authenticated;
GRANT SELECT ON TABLE public.ranks TO anon;

-- =============================================================================
-- user_ranks
-- =============================================================================

-- FK constraint: user_ranks.user_id → auth.users(id) ON DELETE CASCADE
SELECT public.ensure_auth_users_fk('user_ranks', 'user_ranks_user_id_fkey', 'user_id', 'CASCADE');

-- Grant read permissions (read-only for all, write via service role only)
GRANT SELECT ON TABLE public.user_ranks TO authenticated;
GRANT SELECT ON TABLE public.user_ranks TO anon;

-- =============================================================================
-- exp_events
-- =============================================================================

-- FK constraint: exp_events.user_id → auth.users(id) ON DELETE CASCADE
SELECT public.ensure_auth_users_fk('exp_events', 'exp_events_user_id_fkey', 'user_id', 'CASCADE');

-- Grant read permissions (authenticated can SELECT own rows via RLS, service role only write)
GRANT SELECT ON TABLE public.exp_events TO authenticated;

-- =============================================================================
-- user_exp
-- =============================================================================

-- FK constraint: user_exp.user_id → auth.users(id) ON DELETE CASCADE
SELECT public.ensure_auth_users_fk('user_exp', 'user_exp_user_id_fkey', 'user_id', 'CASCADE');

-- Grant read permissions (public read for leaderboard, service role only write)
GRANT SELECT ON TABLE public.user_exp TO authenticated;
GRANT SELECT ON TABLE public.user_exp TO anon;

-- =============================================================================
-- positions
-- =============================================================================

-- FK constraint: positions.user_id → auth.users(id) ON DELETE SET NULL
-- Matches the topic_posts.user_id pattern: submitted positions are a public
-- catalog, so an author's physical purge anonymises the position (user_id →
-- NULL, rendered "(deleted user)") rather than cascading it away. Mirrors
-- games.author_id / chunks.user_id. Logical delete via `deleted_at` remains the
-- usual deprecation path.
SELECT public.ensure_auth_users_fk('positions', 'positions_user_id_fkey', 'user_id', 'SET NULL');

-- Grant necessary permissions (public read for catalog listings; authenticated
-- users create and edit their own positions; physical DELETE is service-role only)
GRANT SELECT, INSERT, UPDATE ON TABLE public.positions TO authenticated;
GRANT SELECT ON TABLE public.positions TO anon;

-- =============================================================================
-- chunks
-- =============================================================================

-- FK constraint: chunks.user_id → auth.users(id) ON DELETE SET NULL
-- Chunks function as a global public catalog, so author deletion should NOT
-- cascade into the catalog. Combined with `position_chunks.chunk_id ON
-- DELETE RESTRICT`, CASCADE here would also deadlock user hard-deletes via
-- the FK graph. Orphaning (user_id → NULL) is the safer fallback; the
-- normal deprecation path remains logical delete via `chunks.deleted_at`.
SELECT public.ensure_auth_users_fk('chunks', 'chunks_user_id_fkey', 'user_id', 'SET NULL');

-- Grant necessary permissions (public read for catalog listing; authenticated
-- users create and edit their own chunks; physical DELETE is service-role only)
GRANT SELECT, INSERT, UPDATE ON TABLE public.chunks TO authenticated;
GRANT SELECT ON TABLE public.chunks TO anon;

-- =============================================================================
-- chunk_edit_requests
-- =============================================================================

-- FK constraint: chunk_edit_requests.proposer_id → auth.users(id) ON DELETE SET NULL
-- Edit requests carry the proposer's audit trail for the chunk owner; if
-- the proposer's account is hard-deleted, the request survives with
-- `proposer_id = NULL` (the application layer renders such rows as
-- "(deleted user)"). Mirrors the chunks.user_id rationale.
SELECT public.ensure_auth_users_fk('chunk_edit_requests', 'chunk_edit_requests_proposer_id_fkey', 'proposer_id', 'SET NULL');

-- FK constraint: chunk_edit_requests.resolver_id → auth.users(id) ON DELETE SET NULL
-- Same rationale as proposer_id — preserves the history when the
-- accepting / rejecting owner is later hard-deleted.
SELECT public.ensure_auth_users_fk('chunk_edit_requests', 'chunk_edit_requests_resolver_id_fkey', 'resolver_id', 'SET NULL');

-- The FK to chunks is managed by Drizzle (ON DELETE CASCADE — physical
-- chunk deletion takes its requests with it). Grants: open read so
-- anyone can see the discussion; authenticated INSERT for proposers and
-- authenticated UPDATE for the proposer-or-owner transitions (gated by
-- the RLS policies).
GRANT SELECT, INSERT, UPDATE ON TABLE public.chunk_edit_requests TO authenticated;
GRANT SELECT ON TABLE public.chunk_edit_requests TO anon;

-- =============================================================================
-- position_edit_requests
-- =============================================================================

-- FK constraint: position_edit_requests.proposer_id → auth.users(id) ON DELETE SET NULL
-- Edit requests carry the proposer's audit trail for the position owner; if
-- the proposer's account is hard-deleted, the request survives with
-- `proposer_id = NULL` (the application layer renders such rows as
-- "(deleted user)"). Mirrors the chunk_edit_requests.proposer_id rationale.
SELECT public.ensure_auth_users_fk('position_edit_requests', 'position_edit_requests_proposer_id_fkey', 'proposer_id', 'SET NULL');

-- FK constraint: position_edit_requests.resolver_id → auth.users(id) ON DELETE SET NULL
-- Same rationale as proposer_id — preserves the history when the
-- accepting / rejecting owner is later hard-deleted.
SELECT public.ensure_auth_users_fk('position_edit_requests', 'position_edit_requests_resolver_id_fkey', 'resolver_id', 'SET NULL');

-- The FK to positions is managed by Drizzle (ON DELETE CASCADE — physical
-- position deletion takes its requests with it). Grants: open read so anyone
-- can see the discussion; authenticated INSERT for proposers and authenticated
-- UPDATE for the proposer-or-owner transitions (gated by the RLS policies).
GRANT SELECT, INSERT, UPDATE ON TABLE public.position_edit_requests TO authenticated;
GRANT SELECT ON TABLE public.position_edit_requests TO anon;

-- =============================================================================
-- position_content_revisions
-- =============================================================================

-- FK constraint: position_content_revisions.editor_id → auth.users(id) ON DELETE SET NULL
-- Preserves the revision (and the fact that *someone* made this edit) when
-- the editor's account is later hard-deleted. Mirrors position_edit_requests.
SELECT public.ensure_auth_users_fk('position_content_revisions', 'position_content_revisions_editor_id_fkey', 'editor_id', 'SET NULL');

-- The FK to positions is managed by Drizzle (ON DELETE CASCADE). Rows are
-- only ever written by the app's own server-side mutation path (inside the
-- same transaction as the positions UPDATE) — never directly by a client —
-- so, like user_ranks / user_achievements, there is no authenticated INSERT
-- grant; this is read-only public history.
GRANT SELECT ON TABLE public.position_content_revisions TO authenticated;
GRANT SELECT ON TABLE public.position_content_revisions TO anon;

-- =============================================================================
-- chunk_feedback_topics
-- =============================================================================

-- The FK to chunks is managed by Drizzle (ON DELETE CASCADE — physical
-- chunk deletion takes its feedback flags with it). Grants: open read so
-- the detail-page callout and the suggestion form can render the flags
-- to anyone; authenticated INSERT / DELETE for the chunk owner (gated by
-- the RLS policies). No UPDATE — the write strategy is "DELETE all rows
-- for this chunk + INSERT new set", so the column-level mutations never
-- need UPDATE.
GRANT SELECT, INSERT, DELETE ON TABLE public.chunk_feedback_topics TO authenticated;
GRANT SELECT ON TABLE public.chunk_feedback_topics TO anon;

-- =============================================================================
-- position_chunks
-- =============================================================================

-- FK constraint: position_chunks.attached_by_user_id → auth.users(id) ON DELETE SET NULL
-- Records who attached the chunk to the position. SET NULL on user
-- hard-delete preserves the junction row itself (the chunk-position
-- association remains valid even if the attaching user is gone) and
-- mirrors the rationale used for `chunks.user_id`.
SELECT public.ensure_auth_users_fk('position_chunks', 'position_chunks_attached_by_user_id_fkey', 'attached_by_user_id', 'SET NULL');

-- The FKs to positions and chunks are managed by Drizzle. Grants only: public
-- read, authenticated INSERT/DELETE gated by RLS on the position's owner.
GRANT SELECT, INSERT, DELETE ON TABLE public.position_chunks TO authenticated;
GRANT SELECT ON TABLE public.position_chunks TO anon;

-- =============================================================================
-- position_themes
-- =============================================================================

-- FK constraint: position_themes.attached_by_user_id → auth.users(id) ON DELETE SET NULL
-- Same rationale as position_chunks.attached_by_user_id: preserve the
-- tag association across user hard-deletes.
SELECT public.ensure_auth_users_fk('position_themes', 'position_themes_attached_by_user_id_fkey', 'attached_by_user_id', 'SET NULL');

-- The FKs to positions and glossary_terms are managed by Drizzle. Grants only:
-- public read, authenticated INSERT/DELETE gated by RLS on the position's
-- owner (and DB-enforced is_theme = true on insert).
GRANT SELECT, INSERT, DELETE ON TABLE public.position_themes TO authenticated;
GRANT SELECT ON TABLE public.position_themes TO anon;

-- =============================================================================
-- point_events
-- =============================================================================

-- FK constraint: point_events.user_id → auth.users(id) ON DELETE CASCADE
-- Matches the exp_events.user_id pattern: when a user is hard-deleted,
-- their ledger rows are removed. The materialized cache
-- (user_point_balances) cascades the same way.
SELECT public.ensure_auth_users_fk('point_events', 'point_events_user_id_fkey', 'user_id', 'CASCADE');

-- Grant read permissions (authenticated can SELECT own rows via RLS, service role only write)
GRANT SELECT ON TABLE public.point_events TO authenticated;

-- =============================================================================
-- user_point_balances
-- =============================================================================

-- FK constraint: user_point_balances.user_id → auth.users(id) ON DELETE CASCADE
SELECT public.ensure_auth_users_fk('user_point_balances', 'user_point_balances_user_id_fkey', 'user_id', 'CASCADE');

-- Grant read permissions (authenticated can SELECT own rows via RLS)
GRANT SELECT ON TABLE public.user_point_balances TO authenticated;

-- =============================================================================
-- point_redemptions
-- =============================================================================

-- FK constraint: point_redemptions.user_id → auth.users(id) ON DELETE CASCADE
-- The FKs to point_events and user_grants are managed by Drizzle.
SELECT public.ensure_auth_users_fk('point_redemptions', 'point_redemptions_user_id_fkey', 'user_id', 'CASCADE');

GRANT SELECT ON TABLE public.point_redemptions TO authenticated;

-- =============================================================================
-- point_purchases
-- =============================================================================

-- FK constraint: point_purchases.user_id → auth.users(id) ON DELETE CASCADE
-- The FK to point_events is managed by Drizzle.
SELECT public.ensure_auth_users_fk('point_purchases', 'point_purchases_user_id_fkey', 'user_id', 'CASCADE');

GRANT SELECT ON TABLE public.point_purchases TO authenticated;

-- =============================================================================
-- point_batch_watermarks
-- =============================================================================
-- Internal batch bookkeeping. No FK to auth.users; no GRANT to non-service
-- roles. RLS is enabled with no policies so authenticated/anon cannot read.

-- =============================================================================
-- games (shared blindfold games — public catalog)
-- =============================================================================

-- FK constraint: games.author_id → auth.users(id) ON DELETE SET NULL
-- Shared games function as a public catalog, so author deletion should NOT
-- cascade the row away. Account-less games have author_id = NULL from the
-- start (owned via game_tokens). Mirrors the chunks.user_id rationale.
SELECT public.ensure_auth_users_fk('games', 'games_author_id_fkey', 'author_id', 'SET NULL');

-- Public catalog read. All writes go through service-role server actions
-- (publish verifies move legality + grants coins; mutations check token /
-- author ownership), so no INSERT/UPDATE grant to non-service roles.
GRANT SELECT ON TABLE public.games TO authenticated;
GRANT SELECT ON TABLE public.games TO anon;

-- =============================================================================
-- game_tokens (capability secret — service-role only)
-- =============================================================================
-- The hashed ownership token. No FK to auth.users; no GRANT to authenticated /
-- anon so the secret is never readable off the service role. RLS is enabled
-- with no policies (see rls_policies.sql). The FK to games is managed by
-- Drizzle (ON DELETE CASCADE).

-- =============================================================================
-- game_comments (third-party advice — public read)
-- =============================================================================

-- FK constraint: game_comments.author_id → auth.users(id) ON DELETE SET NULL
-- Members-only writes (enforced in the action); nullable only so a hard-deleted
-- commenter's advice survives, rendered "(deleted user)". Mirrors
-- chunk_edit_requests.proposer_id.
SELECT public.ensure_auth_users_fk('game_comments', 'game_comments_author_id_fkey', 'author_id', 'SET NULL');

-- The FK to games is managed by Drizzle (ON DELETE CASCADE). Writes go through
-- a members-only, rate-limited server action, so service-role only.
GRANT SELECT ON TABLE public.game_comments TO authenticated;
GRANT SELECT ON TABLE public.game_comments TO anon;

-- =============================================================================
-- game_chunks (community chunk links on a move — public read)
-- =============================================================================
-- FK constraint: game_chunks.suggested_by_id → auth.users(id) ON DELETE SET NULL
-- Nullable only so a hard-deleted member's link survives (attribution drops to
-- anonymous). FKs to games (cascade) / chunks (restrict) are managed by Drizzle.
SELECT public.ensure_auth_users_fk('game_chunks', 'game_chunks_suggested_by_id_fkey', 'suggested_by_id', 'SET NULL');

-- Writes go through a members-only, rate-limited server action, so service-role
-- only; reads are public.
GRANT SELECT ON TABLE public.game_chunks TO authenticated;
GRANT SELECT ON TABLE public.game_chunks TO anon;

-- =============================================================================
-- repertoires (型 — UGC course, private by default) + lines + opening links
-- =============================================================================
-- FK: repertoires.user_id → auth.users(id) ON DELETE SET NULL. Modelled on
-- games: a shared course survives its author's deletion as an orphan rather
-- than cascade away; user_id is nullable for that reason.
SELECT public.ensure_auth_users_fk('repertoires', 'repertoires_user_id_fkey', 'user_id', 'SET NULL');

-- repertoire_lines / repertoire_chapters / repertoire_openings / annotations
-- have no auth.users FK (ownership is the parent repertoire's; their other FKs
-- are Drizzle-managed). Writes go through Drizzle (service role, bypasses RLS),
-- so only SELECT is granted; RLS (see rls_policies.sql) gates direct API reads
-- and is forward-ready for the planned catalog. Content tables are anon-readable
-- (a public course's chapters/lines/annotations).
GRANT SELECT ON TABLE public.repertoires TO authenticated;
GRANT SELECT ON TABLE public.repertoires TO anon;
GRANT SELECT ON TABLE public.repertoire_chapters TO authenticated;
GRANT SELECT ON TABLE public.repertoire_chapters TO anon;
GRANT SELECT ON TABLE public.repertoire_lines TO authenticated;
GRANT SELECT ON TABLE public.repertoire_lines TO anon;
GRANT SELECT ON TABLE public.repertoire_openings TO authenticated;
GRANT SELECT ON TABLE public.repertoire_openings TO anon;
GRANT SELECT ON TABLE public.repertoire_annotations TO authenticated;
GRANT SELECT ON TABLE public.repertoire_annotations TO anon;

-- repertoire_chunks (community chunk links on a repertoire position)
SELECT public.ensure_auth_users_fk('repertoire_chunks', 'repertoire_chunks_suggested_by_id_fkey', 'suggested_by_id', 'SET NULL');
GRANT SELECT ON TABLE public.repertoire_chunks TO authenticated;
GRANT SELECT ON TABLE public.repertoire_chunks TO anon;

-- Per-user learning state (reviews / deviations): user_id → auth.users
-- ON DELETE CASCADE (the state is meaningless without its owner). These are
-- private to the user — SELECT for authenticated only, never anon.
SELECT public.ensure_auth_users_fk('repertoire_reviews', 'repertoire_reviews_user_id_fkey', 'user_id', 'CASCADE');
SELECT public.ensure_auth_users_fk('repertoire_deviations', 'repertoire_deviations_user_id_fkey', 'user_id', 'CASCADE');

GRANT SELECT ON TABLE public.repertoire_reviews TO authenticated;
GRANT SELECT ON TABLE public.repertoire_deviations TO authenticated;
