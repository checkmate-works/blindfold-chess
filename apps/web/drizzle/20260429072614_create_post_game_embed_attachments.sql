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

-- Composite index for potential future embed dedup (mirrors Lichess reuse on PGN table)
CREATE INDEX "idx_post_game_embed_attachments_provider_id"
  ON "post_game_embed_attachments" ("embed_provider", "embed_id");
