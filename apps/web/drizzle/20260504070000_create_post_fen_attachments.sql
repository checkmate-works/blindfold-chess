-- post_fen_attachments — 1:0..1 FEN attachment per topic_post.
--
-- Sibling of post_game_pgn_attachments / post_game_embed_attachments /
-- post_image_attachments (Pattern 5 per-kind tables; see
-- docs/design/SPEC1-embed-data-model-ADR.md). Stores a single FEN string
-- representing a static chess position, used to render a mini-board
-- attached to a topic post (renderer is deferred to a follow-up issue).
--
-- 1:0..1 invariant is enforced by the UNIQUE constraint on post_id; a post
-- has at most one FEN attachment.
--
-- Two-layer FEN validation:
--   1. CHECK constraint here (coarse structural net) rejects whitespace-only
--      input, control characters, malformed shapes, and obviously invalid
--      castling / en passant fields. Castling is restricted to standard FEN
--      (KQkq); the issue's regex allowed Shredder-FEN (A-Ha-h) but Chess960
--      is out of scope. En passant rank is restricted to 3 or 6 — the only
--      semantically valid ranks per FIDE — even though the issue's regex
--      allowed any 1-8.
--   2. Application-layer chess-core `validateFenSemantic` (see
--      packages/features/src/chess-core/validate-fen-semantic.ts) enforces
--      piece counts (exactly one king per side, ≤ 8 pawns, no pawns on
--      rank 1 or 8), castling-rights consistency (rook + king on starting
--      squares), and en passant target consistency (correct rank for side
--      to move + pawn behind the target). The DB CHECK is the last line of
--      defense against a direct REST insert that bypassed the Server Action.

CREATE TABLE "post_fen_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  -- FEN length cap: 100 chars. The longest realistic FEN is ~88 characters
  -- (32-piece middlegame with 4-character castling and a 2-character ep
  -- square). 100 is a comfortable upper bound that still rejects pathological
  -- inputs.
  "fen" varchar(100) NOT NULL,
  -- Caption is optional and capped at 200 chars to match
  -- post_game_pgn_attachments header columns. Sanitized application-side via
  -- sanitizeFenCaption() to strip Trojan Source / zero-width / TAG /
  -- Musical Symbol formatter codepoints before persistence.
  "caption" varchar(200),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "post_fen_attachments_post_id_unique" UNIQUE("post_id"),
  -- Structural FEN regex. Tightenings vs. the issue spec:
  --   • castling   : standard FEN only (KQkq), no Chess960 / Shredder-FEN
  --                  files (the issue's regex allowed [A-Ha-h] but Chess960
  --                  is out of scope here);
  --   • en passant : rank restricted to 3 or 6 (the only semantically valid
  --                  ranks); the issue's regex allowed any 1-8.
  -- Placement is intentionally permissive — chess-core semantic validation
  -- (kings, pawn placement, castling/ep consistency) fills the gap.
  CONSTRAINT "post_fen_attachments_chk_fen_format"
    CHECK (
      "fen" ~ '^[rnbqkpRNBQKP1-8/]+ [wb] (-|[KQkq]+) (-|[a-h][36]) [0-9]+ [0-9]+$'
    )
);
--> statement-breakpoint

ALTER TABLE "post_fen_attachments"
  ADD CONSTRAINT "post_fen_attachments_post_id_topic_posts_id_fk"
  FOREIGN KEY ("post_id") REFERENCES "public"."topic_posts"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "idx_post_fen_attachments_post"
  ON "post_fen_attachments" USING btree ("post_id");
