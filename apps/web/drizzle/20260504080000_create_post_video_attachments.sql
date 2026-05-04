-- post_video_attachments — 1:0..1 video attachment per topic_post.
--
-- Sibling of post_game_pgn_attachments / post_game_embed_attachments /
-- post_image_attachments / post_fen_attachments (Pattern 5 per-kind tables;
-- see docs/design/SPEC1-embed-data-model-ADR.md). Stores a single embeddable
-- video reference (MVP: YouTube only) attached to a topic post.
--
-- 1:0..1 invariant is enforced by the UNIQUE constraint on post_id; a post
-- has at most one video attachment.
--
-- Two-layer video validation:
--   1. Application-layer URL parser (`parseYouTubeUrl` in
--      apps/web/src/lib/games/youtube-validator.ts) decomposes a user-supplied
--      URL into (provider, providerVideoId, sourceUrl) and rejects hostile
--      shapes (non-https / userinfo trick / IDN homograph / wrong host /
--      param pollution / fragment / non-11-char id).
--   2. The CHECK constraints below are the DB-level last line of defense
--      against a direct REST insert that bypassed the Server Action. The
--      `provider_video_id` regex is byte-for-byte aligned with the JS regex
--      enforced after URL parsing.
--
-- The renderer rebuilds the iframe `src` from `(provider, provider_video_id)`
-- via the privacy-enhanced `youtube-nocookie.com` host — `source_url` is
-- audit-only and is NEVER passed to the iframe.

CREATE TABLE "post_video_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  -- Provider discriminator. MVP allows only 'youtube'; extending to
  -- 'vimeo' / 'twitch' requires (a) a new branch in the URL parser,
  -- (b) a renderer mapping for the embed src, (c) widening this CHECK,
  -- and (d) widening the host CHECK on `source_url` below.
  "provider" varchar(20) NOT NULL,
  -- Provider-scoped video id. YouTube ids are exactly 11 chars from
  -- `[A-Za-z0-9_-]`. The regex is byte-for-byte aligned with
  -- `YOUTUBE_VIDEO_ID_RE` in youtube-validator.ts.
  "provider_video_id" varchar(64) NOT NULL,
  -- Audit-only: the original URL the user pasted. The renderer does NOT
  -- use this value; the iframe src is rebuilt from
  -- (provider, provider_video_id). Capped at 512 chars to match the URL
  -- parser's input length cap.
  "source_url" varchar(512),
  -- MVP is NULL because oEmbed is deferred (issue #75 M-6). Reserved for
  -- a future oEmbed integration that pulls title from
  -- https://www.youtube.com/oembed?url=... behind the same SSRF defense
  -- pattern used by lichess.ts.
  "title" varchar(200),
  -- Likewise NULL in MVP. The renderer derives the thumbnail URL from
  -- `provider_video_id` via the canonical YouTube thumbnail template
  -- (img.youtube.com/vi/{id}/hqdefault.jpg) at read time.
  "thumbnail_url" varchar(1024),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "post_video_attachments_post_id_unique" UNIQUE("post_id"),
  CONSTRAINT "post_video_attachments_chk_provider"
    CHECK ("provider" IN ('youtube')),
  -- 11-char base64url alphabet for YouTube video ids. Byte-for-byte
  -- aligned with YOUTUBE_VIDEO_ID_RE in youtube-validator.ts.
  CONSTRAINT "post_video_attachments_chk_provider_video_id"
    CHECK ("provider_video_id" ~ '^[A-Za-z0-9_-]{11}$'),
  -- Source URL host allow-list. Mirrors the host allow-list in
  -- youtube-validator.ts but is intentionally coarser (substring-style
  -- prefix match). Permitted hosts: youtube.com, www.youtube.com,
  -- youtu.be, www.youtube-nocookie.com.
  CONSTRAINT "post_video_attachments_chk_source_url"
    CHECK (
      "source_url" IS NULL
      OR "source_url" ~ '^https://www\.youtube\.com/'
      OR "source_url" ~ '^https://youtube\.com/'
      OR "source_url" ~ '^https://youtu\.be/'
      OR "source_url" ~ '^https://www\.youtube-nocookie\.com/'
    ),
  -- Thumbnail URL host allow-list. Reserved for the future oEmbed flow
  -- that may persist a CDN-hosted thumbnail; the MVP renderer derives
  -- the URL from `provider_video_id` and never reads this column.
  CONSTRAINT "post_video_attachments_chk_thumbnail_url"
    CHECK (
      "thumbnail_url" IS NULL
      OR "thumbnail_url" ~ '^https://i\.ytimg\.com/'
      OR "thumbnail_url" ~ '^https://img\.youtube\.com/'
    )
);
--> statement-breakpoint

ALTER TABLE "post_video_attachments"
  ADD CONSTRAINT "post_video_attachments_post_id_topic_posts_id_fk"
  FOREIGN KEY ("post_id") REFERENCES "public"."topic_posts"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "idx_post_video_attachments_post"
  ON "post_video_attachments" USING btree ("post_id");
