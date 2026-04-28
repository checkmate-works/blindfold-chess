-- Phase F (C-2 + M-3): chess.com attribution columns + PGN length spoofing CHECK.
--
-- (C-2) Off-platform game attribution
--
-- chess.com forbids automated scraping of game pages, so we cannot
-- fetch the PGN ourselves. Users paste the PGN manually and supply
-- the chess.com URL purely for credit + click-through. Storing the
-- URL as a (platform, path) pair instead of a free-form URL means the
-- rendered href can be rebuilt server-side from validated components,
-- so a hostile / drifted persisted URL cannot end up in the public
-- DOM as a clickable link. See `parseChesscomAttribution` for the
-- input validator.
ALTER TABLE "post_game_attachments"
  ADD COLUMN "attribution_platform" varchar(20),
  ADD COLUMN "attribution_path" varchar(160);--> statement-breakpoint

-- attribution_platform allow-list. MVP supports 'chesscom' only —
-- additional platforms are added by extending this CHECK + the parser.
ALTER TABLE "post_game_attachments"
  ADD CONSTRAINT "chk_attribution_platform_valid"
  CHECK (
    "attribution_platform" IS NULL
    OR "attribution_platform" IN ('chesscom')
  );--> statement-breakpoint

-- attribution_path format: must start with `/`, allow only the
-- characters that the URL parser produces (alphanumerics, `/`, `_`,
-- `-`), and stay within 1..128 chars. Mirrors the regex in
-- `parseChesscomAttribution` so a direct REST write that bypasses
-- the application path still cannot land an unsafe value.
ALTER TABLE "post_game_attachments"
  ADD CONSTRAINT "chk_attribution_path_format"
  CHECK (
    "attribution_path" IS NULL
    OR "attribution_path" ~ '^/[A-Za-z0-9/_-]{1,128}$'
  );--> statement-breakpoint

-- Pair invariant: either both columns are NULL or both are NOT NULL.
-- A half-populated row would render with a broken / partial href.
ALTER TABLE "post_game_attachments"
  ADD CONSTRAINT "chk_attribution_pair"
  CHECK (
    ("attribution_platform" IS NULL AND "attribution_path" IS NULL)
    OR ("attribution_platform" IS NOT NULL AND "attribution_path" IS NOT NULL)
  );--> statement-breakpoint

-- (M-3) Defense-in-depth against PGN length spoofing.
--
-- `pgn_byte_length` is a precomputed cache used by `chk_pgn_byte_length`
-- to enforce the 100 KB cap without re-measuring `pgn` on every check.
-- Without this constraint a writer could submit `pgn_byte_length = 100`
-- alongside a 5 MB PGN and slip past the size cap. Pinning the cached
-- value to `octet_length(pgn)` closes that gap at the DB.
ALTER TABLE "post_game_attachments"
  ADD CONSTRAINT "chk_pgn_byte_length_matches_octet_length"
  CHECK ("pgn_byte_length" = octet_length("pgn"));
