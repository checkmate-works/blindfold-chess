-- Rename post_game_attachments → post_game_pgn_attachments
ALTER TABLE "post_game_attachments" RENAME TO "post_game_pgn_attachments";

-- Rename surviving indexes (the two redundant ones were already dropped by
-- migration 20260428204546_drop_redundant_post_game_attachments_indexes.sql)
ALTER INDEX "idx_post_game_attachments_size"
  RENAME TO "idx_post_game_pgn_attachments_size";
ALTER INDEX "idx_post_game_attachments_source_game"
  RENAME TO "idx_post_game_pgn_attachments_source_game";

-- Rename UNIQUE constraint on post_id
ALTER TABLE "post_game_pgn_attachments"
  RENAME CONSTRAINT "post_game_attachments_post_id_unique"
  TO "post_game_pgn_attachments_post_id_unique";

-- Rename FK constraint
ALTER TABLE "post_game_pgn_attachments"
  RENAME CONSTRAINT "post_game_attachments_post_id_topic_posts_id_fk"
  TO "post_game_pgn_attachments_post_id_topic_posts_id_fk";

-- The legacy PK constraint name `topic_post_attachments_pkey` was never
-- renamed in the Phase F rename migration (only UNIQUE and FK were).
-- This block tolerates the case where the PK has already been renamed
-- elsewhere or where the original auto-generated name differs.
DO $$
BEGIN
  ALTER TABLE "post_game_pgn_attachments"
    RENAME CONSTRAINT "topic_post_attachments_pkey"
    TO "post_game_pgn_attachments_pkey";
EXCEPTION
  WHEN undefined_object THEN
    -- PK already renamed or has a different name; safe to skip.
    NULL;
END$$;

-- Rename CHECK constraints (Postgres does not auto-rename on ALTER TABLE RENAME)
ALTER TABLE "post_game_pgn_attachments"
  RENAME CONSTRAINT "chk_pgn_byte_length" TO "post_game_pgn_attachments_chk_pgn_byte_length";
ALTER TABLE "post_game_pgn_attachments"
  RENAME CONSTRAINT "chk_source_valid" TO "post_game_pgn_attachments_chk_source_valid";
ALTER TABLE "post_game_pgn_attachments"
  RENAME CONSTRAINT "chk_source_url_required_for_external"
  TO "post_game_pgn_attachments_chk_source_url_required_for_external";
ALTER TABLE "post_game_pgn_attachments"
  RENAME CONSTRAINT "chk_source_url_audit_https"
  TO "post_game_pgn_attachments_chk_source_url_audit_https";
ALTER TABLE "post_game_pgn_attachments"
  RENAME CONSTRAINT "chk_pgn_byte_length_matches_octet_length"
  TO "post_game_pgn_attachments_chk_pgn_byte_length_matches_octet_length";
ALTER TABLE "post_game_pgn_attachments"
  RENAME CONSTRAINT "chk_attribution_platform_valid"
  TO "post_game_pgn_attachments_chk_attribution_platform_valid";
ALTER TABLE "post_game_pgn_attachments"
  RENAME CONSTRAINT "chk_attribution_path_format"
  TO "post_game_pgn_attachments_chk_attribution_path_format";
ALTER TABLE "post_game_pgn_attachments"
  RENAME CONSTRAINT "chk_attribution_pair"
  TO "post_game_pgn_attachments_chk_attribution_pair";
