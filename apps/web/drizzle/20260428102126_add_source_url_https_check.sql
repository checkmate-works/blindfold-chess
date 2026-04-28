-- Phase H (M-3): tighten `post_game_attachments.source_url`.
--
-- `source_url` is an audit-only column. The application never reads
-- it back as a clickable href — the renderer rebuilds the URL from
-- (source, source_game_id) for Lichess and from
-- (attribution_platform, attribution_path) for chess.com. See
-- `apps/web/src/app/[locale]/(public)/topics/_components/AttachedGameCard.tsx`
-- and the @security TSDoc on the `sourceUrl` column for the full rule.
--
-- This CHECK is a last line of defense: if a future refactor (or a
-- debug surface, an admin tool, an export job) accidentally renders
-- the column as an href, a `javascript:` / `data:` / `file:` payload
-- still cannot reach the user's browser — the writer would have been
-- rejected at the DB level long before. NULL remains valid because
-- pure-PGN attachments do not carry a source URL at all.
ALTER TABLE "post_game_attachments"
  ADD CONSTRAINT "chk_source_url_audit_https"
  CHECK ("source_url" IS NULL OR "source_url" ~ '^https://');
