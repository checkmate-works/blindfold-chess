-- Phase A–B squash: creates post_game_pgn_attachments and post_game_embed_attachments
-- in their final post-Phase-B schema state.
--
-- This file replaces migrations 20260427095052 through 20260429072614 (8 files).
-- All intermediate renames, compat VIEW, and dropped indexes are omitted; the
-- schema produced here is identical to running the 8 originals in sequence.

CREATE TABLE "post_game_pgn_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "source" varchar(20) NOT NULL,
  "source_url" varchar(512),
  "source_game_id" varchar(64),
  "pgn" text NOT NULL,
  "pgn_byte_length" integer NOT NULL,
  "starting_fen" varchar(100),
  "move_count" integer DEFAULT 0 NOT NULL,
  "header_white" varchar(100),
  "header_black" varchar(100),
  "header_result" varchar(10),
  "header_event" varchar(200),
  "header_site" varchar(200),
  "header_date" varchar(20),
  "anonymized" boolean DEFAULT false NOT NULL,
  "attribution_platform" varchar(20),
  "attribution_path" varchar(160),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "post_game_pgn_attachments_post_id_unique" UNIQUE("post_id"),
  -- Size cap: 100 KB. pgn_byte_length is a precomputed cache for this check.
  CONSTRAINT "post_game_pgn_attachments_chk_pgn_byte_length"
    CHECK ("pgn_byte_length" > 0 AND "pgn_byte_length" <= 102400),
  CONSTRAINT "post_game_pgn_attachments_chk_source_valid"
    CHECK ("source" IN ('pgn', 'lichess')),
  CONSTRAINT "post_game_pgn_attachments_chk_source_url_required_for_external"
    CHECK ("source" = 'pgn' OR "source_url" IS NOT NULL),
  -- source_url is audit-only. This CHECK is last-line-of-defense against
  -- a future refactor accidentally rendering it as an href.
  CONSTRAINT "post_game_pgn_attachments_chk_source_url_audit_https"
    CHECK ("source_url" IS NULL OR "source_url" ~ '^https://'),
  -- Defense-in-depth against pgn_byte_length spoofing.
  CONSTRAINT "post_game_pgn_attachments_chk_pgn_byte_length_matches_octet_length"
    CHECK ("pgn_byte_length" = octet_length("pgn")),
  -- Chess.com attribution. attribution_platform allow-list (MVP: 'chesscom' only).
  CONSTRAINT "post_game_pgn_attachments_chk_attribution_platform_valid"
    CHECK (
      "attribution_platform" IS NULL
      OR "attribution_platform" IN ('chesscom')
    ),
  -- attribution_path format mirrors parseChesscomAttribution regex.
  CONSTRAINT "post_game_pgn_attachments_chk_attribution_path_format"
    CHECK (
      "attribution_path" IS NULL
      OR "attribution_path" ~ '^/[A-Za-z0-9/_-]{1,128}$'
    ),
  -- Either both attribution columns are NULL or both are NOT NULL.
  CONSTRAINT "post_game_pgn_attachments_chk_attribution_pair"
    CHECK (
      ("attribution_platform" IS NULL AND "attribution_path" IS NULL)
      OR ("attribution_platform" IS NOT NULL AND "attribution_path" IS NOT NULL)
    )
);
--> statement-breakpoint
ALTER TABLE "post_game_pgn_attachments"
  ADD CONSTRAINT "post_game_pgn_attachments_post_id_topic_posts_id_fk"
  FOREIGN KEY ("post_id") REFERENCES "public"."topic_posts"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Size index: used by pgn_byte_length range queries.
CREATE INDEX "idx_post_game_pgn_attachments_size"
  ON "post_game_pgn_attachments" USING btree ("pgn_byte_length");
--> statement-breakpoint
-- Composite index for Lichess reuse cache lookup (source='lichess' AND source_game_id=?).
CREATE INDEX "idx_post_game_pgn_attachments_source_game"
  ON "post_game_pgn_attachments" USING btree ("source", "source_game_id");
--> statement-breakpoint

-- post_game_embed_attachments: stores iframe embed metadata for chess.com and Lichess.
-- Write path is Phase B; this table is scaffold-only at Phase A.2.
CREATE TABLE "post_game_embed_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "post_id" uuid NOT NULL UNIQUE
    REFERENCES "topic_posts"("id") ON DELETE CASCADE,
  "embed_provider" varchar(20) NOT NULL,
  "embed_id" varchar(64) NOT NULL,
  "source_url" varchar(512),
  "attribution_platform" varchar(20),
  "attribution_path" varchar(160),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "post_game_embed_attachments_chk_embed_provider_valid"
    CHECK ("embed_provider" IN ('chesscom', 'lichess')),
  CONSTRAINT "post_game_embed_attachments_chk_embed_id_format"
    CHECK ("embed_id" ~ '^[A-Za-z0-9_-]{1,64}$'),
  CONSTRAINT "post_game_embed_attachments_chk_embed_source_url_https"
    CHECK ("source_url" IS NULL OR "source_url" ~ '^https://'),
  CONSTRAINT "post_game_embed_attachments_chk_embed_attribution_platform_valid"
    CHECK (
      "attribution_platform" IS NULL
      OR "attribution_platform" IN ('chesscom', 'lichess')
    ),
  CONSTRAINT "post_game_embed_attachments_chk_embed_attribution_path_format"
    CHECK (
      "attribution_path" IS NULL
      OR "attribution_path" ~ '^/[A-Za-z0-9/_-]{1,128}$'
    ),
  CONSTRAINT "post_game_embed_attachments_chk_embed_attribution_pair"
    CHECK (
      ("attribution_platform" IS NULL AND "attribution_path" IS NULL)
      OR ("attribution_platform" IS NOT NULL AND "attribution_path" IS NOT NULL)
    )
);
--> statement-breakpoint
-- Composite index for potential future embed dedup (mirrors Lichess reuse on PGN table).
CREATE INDEX "idx_post_game_embed_attachments_provider_id"
  ON "post_game_embed_attachments" ("embed_provider", "embed_id");
