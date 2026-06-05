-- Foreign Keys and Grants
-- This file configures FK constraints (to auth.users) and table-level
-- permissions for all tables that reference Supabase Auth.
--
-- This file is automatically applied by scripts/migrate.ts on Supabase environments.
-- It requires Supabase-managed roles (supabase_auth_admin, authenticated, anon)
-- and will fail on local PostgreSQL — this is intentional.

-- =============================================================================
-- profiles
-- =============================================================================

-- Cleanup: remove legacy trigger and function (moved to app layer)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- FK constraint: profiles.id → auth.users(id)
-- Using DO block to avoid errors if the constraint already exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE RESTRICT;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon;

-- =============================================================================
-- topic_posts
-- =============================================================================

-- FK constraint: topic_posts.user_id → auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'topic_posts_user_id_fkey'
  ) THEN
    ALTER TABLE public.topic_posts
      ADD CONSTRAINT topic_posts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

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
GRANT SELECT, INSERT, DELETE ON TABLE public.topic_posts TO authenticated;
GRANT SELECT ON TABLE public.topic_posts TO anon;

-- =============================================================================
-- moderation_actions
-- =============================================================================

-- FK constraint: moderation_actions.actor_id → auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'moderation_actions_actor_id_fkey'
  ) THEN
    ALTER TABLE public.moderation_actions
      ADD CONSTRAINT moderation_actions_actor_id_fkey
      FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT ON TABLE public.moderation_actions TO authenticated;

-- =============================================================================
-- user_follows & user_blocks
-- =============================================================================

-- FK constraint: user_follows.follower_id → auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_follows_follower_id_fkey'
  ) THEN
    ALTER TABLE public.user_follows
      ADD CONSTRAINT user_follows_follower_id_fkey
      FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- FK constraint: user_follows.following_id → auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_follows_following_id_fkey'
  ) THEN
    ALTER TABLE public.user_follows
      ADD CONSTRAINT user_follows_following_id_fkey
      FOREIGN KEY (following_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- FK constraint: user_blocks.blocker_id → auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_blocks_blocker_id_fkey'
  ) THEN
    ALTER TABLE public.user_blocks
      ADD CONSTRAINT user_blocks_blocker_id_fkey
      FOREIGN KEY (blocker_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- FK constraint: user_blocks.blocked_id → auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_blocks_blocked_id_fkey'
  ) THEN
    ALTER TABLE public.user_blocks
      ADD CONSTRAINT user_blocks_blocked_id_fkey
      FOREIGN KEY (blocked_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON TABLE public.user_follows TO authenticated;
GRANT SELECT ON TABLE public.user_follows TO anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.user_blocks TO authenticated;

-- =============================================================================
-- notifications
-- =============================================================================

-- FK constraint: notifications.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- FK constraint: notifications.actor_id → auth.users(id) ON DELETE SET NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_actor_id_fkey'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_actor_id_fkey
      FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- Grant necessary permissions (no INSERT — controlled by server-side only)
GRANT SELECT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;

-- =============================================================================
-- rate_limit_events
-- =============================================================================

-- FK constraint: rate_limit_events.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rate_limit_events_user_id_fkey'
  ) THEN
    ALTER TABLE public.rate_limit_events
      ADD CONSTRAINT rate_limit_events_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_activity_log_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_activity_log
      ADD CONSTRAINT user_activity_log_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT ON TABLE public.user_activity_log TO authenticated;

-- =============================================================================
-- user_roles
-- =============================================================================

-- FK constraint: user_roles.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

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

-- FK constraint: likes.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'likes_user_id_fkey'
  ) THEN
    ALTER TABLE public.likes
      ADD CONSTRAINT likes_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON TABLE public.likes TO authenticated;
GRANT SELECT ON TABLE public.likes TO anon;

-- =============================================================================
-- challenge_results
-- =============================================================================

-- FK constraint: challenge_results.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'challenge_results_user_id_fkey'
  ) THEN
    ALTER TABLE public.challenge_results
      ADD CONSTRAINT challenge_results_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions (public read for leaderboard display)
GRANT SELECT, INSERT ON TABLE public.challenge_results TO authenticated;
GRANT SELECT ON TABLE public.challenge_results TO anon;

-- =============================================================================
-- challenge_best_scores
-- =============================================================================

-- FK constraint: challenge_best_scores.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'challenge_best_scores_user_id_fkey'
  ) THEN
    ALTER TABLE public.challenge_best_scores
      ADD CONSTRAINT challenge_best_scores_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions (public read for leaderboard display, UPDATE for UPSERT)
GRANT SELECT, INSERT, UPDATE ON TABLE public.challenge_best_scores TO authenticated;
GRANT SELECT ON TABLE public.challenge_best_scores TO anon;

-- =============================================================================
-- feed_items
-- =============================================================================

-- FK constraint: feed_items.actor_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feed_items_actor_id_fkey'
  ) THEN
    ALTER TABLE public.feed_items
      ADD CONSTRAINT feed_items_actor_id_fkey
      FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions (public read for timeline, server-side INSERT)
GRANT SELECT, INSERT ON TABLE public.feed_items TO authenticated;
GRANT SELECT ON TABLE public.feed_items TO anon;

-- =============================================================================
-- stripe_customers
-- =============================================================================

-- FK constraint: stripe_customers.user_id -> auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stripe_customers_user_id_fkey'
  ) THEN
    ALTER TABLE public.stripe_customers
      ADD CONSTRAINT stripe_customers_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Server-side only writes (no INSERT/UPDATE for authenticated)
GRANT SELECT ON TABLE public.stripe_customers TO authenticated;

-- =============================================================================
-- subscriptions
-- =============================================================================

-- FK constraint: subscriptions.user_id -> auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_fkey'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Users can read their own subscriptions; writes are server-side only
GRANT SELECT ON TABLE public.subscriptions TO authenticated;

-- =============================================================================
-- user_interview_answers
-- =============================================================================

-- FK constraint: user_interview_answers.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_interview_answers_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_interview_answers
      ADD CONSTRAINT user_interview_answers_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_ranks_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_ranks
      ADD CONSTRAINT user_ranks_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant read permissions (read-only for all, write via service role only)
GRANT SELECT ON TABLE public.user_ranks TO authenticated;
GRANT SELECT ON TABLE public.user_ranks TO anon;

-- =============================================================================
-- exp_events
-- =============================================================================

-- FK constraint: exp_events.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exp_events_user_id_fkey'
  ) THEN
    ALTER TABLE public.exp_events
      ADD CONSTRAINT exp_events_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant read permissions (authenticated can SELECT own rows via RLS, service role only write)
GRANT SELECT ON TABLE public.exp_events TO authenticated;

-- =============================================================================
-- user_exp
-- =============================================================================

-- FK constraint: user_exp.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_exp_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_exp
      ADD CONSTRAINT user_exp_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant read permissions (public read for leaderboard, service role only write)
GRANT SELECT ON TABLE public.user_exp TO authenticated;
GRANT SELECT ON TABLE public.user_exp TO anon;

-- =============================================================================
-- positions
-- =============================================================================

-- FK constraint: positions.user_id → auth.users(id) ON DELETE CASCADE
-- Matches the topic_posts.user_id pattern: when a user is hard-deleted,
-- their submitted positions go with them. Logical delete via
-- `deleted_at` remains the usual deprecation path.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'positions_user_id_fkey'
  ) THEN
    ALTER TABLE public.positions
      ADD CONSTRAINT positions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chunks_user_id_fkey'
  ) THEN
    ALTER TABLE public.chunks
      ADD CONSTRAINT chunks_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chunk_edit_requests_proposer_id_fkey'
  ) THEN
    ALTER TABLE public.chunk_edit_requests
      ADD CONSTRAINT chunk_edit_requests_proposer_id_fkey
      FOREIGN KEY (proposer_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- FK constraint: chunk_edit_requests.resolver_id → auth.users(id) ON DELETE SET NULL
-- Same rationale as proposer_id — preserves the history when the
-- accepting / rejecting owner is later hard-deleted.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chunk_edit_requests_resolver_id_fkey'
  ) THEN
    ALTER TABLE public.chunk_edit_requests
      ADD CONSTRAINT chunk_edit_requests_resolver_id_fkey
      FOREIGN KEY (resolver_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- The FK to chunks is managed by Drizzle (ON DELETE CASCADE — physical
-- chunk deletion takes its requests with it). Grants: open read so
-- anyone can see the discussion; authenticated INSERT for proposers and
-- authenticated UPDATE for the proposer-or-owner transitions (gated by
-- the RLS policies).
GRANT SELECT, INSERT, UPDATE ON TABLE public.chunk_edit_requests TO authenticated;
GRANT SELECT ON TABLE public.chunk_edit_requests TO anon;

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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'position_chunks_attached_by_user_id_fkey'
  ) THEN
    ALTER TABLE public.position_chunks
      ADD CONSTRAINT position_chunks_attached_by_user_id_fkey
      FOREIGN KEY (attached_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'position_themes_attached_by_user_id_fkey'
  ) THEN
    ALTER TABLE public.position_themes
      ADD CONSTRAINT position_themes_attached_by_user_id_fkey
      FOREIGN KEY (attached_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'point_events_user_id_fkey'
  ) THEN
    ALTER TABLE public.point_events
      ADD CONSTRAINT point_events_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant read permissions (authenticated can SELECT own rows via RLS, service role only write)
GRANT SELECT ON TABLE public.point_events TO authenticated;

-- =============================================================================
-- user_point_balances
-- =============================================================================

-- FK constraint: user_point_balances.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_point_balances_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_point_balances
      ADD CONSTRAINT user_point_balances_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant read permissions (authenticated can SELECT own rows via RLS)
GRANT SELECT ON TABLE public.user_point_balances TO authenticated;

-- =============================================================================
-- point_redemptions
-- =============================================================================

-- FK constraint: point_redemptions.user_id → auth.users(id) ON DELETE CASCADE
-- The FKs to point_events and user_grants are managed by Drizzle.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'point_redemptions_user_id_fkey'
  ) THEN
    ALTER TABLE public.point_redemptions
      ADD CONSTRAINT point_redemptions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

GRANT SELECT ON TABLE public.point_redemptions TO authenticated;

-- =============================================================================
-- point_purchases
-- =============================================================================

-- FK constraint: point_purchases.user_id → auth.users(id) ON DELETE CASCADE
-- The FK to point_events is managed by Drizzle.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'point_purchases_user_id_fkey'
  ) THEN
    ALTER TABLE public.point_purchases
      ADD CONSTRAINT point_purchases_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'games_author_id_fkey'
  ) THEN
    ALTER TABLE public.games
      ADD CONSTRAINT games_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_comments_author_id_fkey'
  ) THEN
    ALTER TABLE public.game_comments
      ADD CONSTRAINT game_comments_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_chunks_suggested_by_id_fkey'
  ) THEN
    ALTER TABLE public.game_chunks
      ADD CONSTRAINT game_chunks_suggested_by_id_fkey
      FOREIGN KEY (suggested_by_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- Writes go through a members-only, rate-limited server action, so service-role
-- only; reads are public.
GRANT SELECT ON TABLE public.game_chunks TO authenticated;
GRANT SELECT ON TABLE public.game_chunks TO anon;

-- =============================================================================
-- user_lines (private repertoire trees / 型 — owner-only)
-- =============================================================================
-- FK constraint: user_lines.user_id → auth.users(id) ON DELETE CASCADE
-- Lines are private user-generated content with no value once the owner is
-- gone, so deletion cascades (unlike the public games catalog, which keeps
-- orphans). user_id is NOT NULL — there is no anonymous-author path here.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_lines_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_lines
      ADD CONSTRAINT user_lines_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Owner-only, never public. The app reads/writes via Drizzle (service role,
-- bypasses RLS); the GRANT + owner-scoped RLS (see rls_policies.sql) are
-- defense-in-depth for the authenticated API. No anon grant.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_lines TO authenticated;
