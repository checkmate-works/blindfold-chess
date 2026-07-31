-- Split a line's identity (`line_no`, the URL segment) out of its display
-- order (`seq`). Added nullable, backfilled, then tightened to NOT NULL.
ALTER TABLE "repertoire_lines" ADD COLUMN "line_no" integer;--> statement-breakpoint

-- Live rows keep the exact number they answer to today. `seq` is dense
-- 0..n-1 among live rows (every write path maintains that: import inserts
-- 0..n-1, append takes max+1, delete repacks), so `seq + 1` reproduces the
-- current URL for every reachable line. If that invariant is ever violated the
-- UNIQUE below fails this migration rather than silently reassigning URLs.
UPDATE "repertoire_lines" SET "line_no" = "seq" + 1 WHERE "deleted_at" IS NULL;--> statement-breakpoint

-- Soft-deleted rows are parked above their repertoire's live range. Their
-- number is meaningless (no query reads them), but it must not collide with a
-- live line: `seq` was left frozen at delete time while the survivors were
-- repacked underneath it, so a deleted row's `seq + 1` commonly duplicates a
-- live line's.
WITH "live_count" AS (
  SELECT "repertoire_id", COUNT(*) AS "n"
  FROM "repertoire_lines"
  WHERE "deleted_at" IS NULL
  GROUP BY "repertoire_id"
), "parked" AS (
  SELECT
    "rl"."id",
    COALESCE("lc"."n", 0) + ROW_NUMBER() OVER (
      PARTITION BY "rl"."repertoire_id" ORDER BY "rl"."seq", "rl"."id"
    ) AS "line_no"
  FROM "repertoire_lines" "rl"
  LEFT JOIN "live_count" "lc" ON "lc"."repertoire_id" = "rl"."repertoire_id"
  WHERE "rl"."deleted_at" IS NOT NULL
)
UPDATE "repertoire_lines" "rl"
SET "line_no" = "parked"."line_no"
FROM "parked"
WHERE "rl"."id" = "parked"."id";--> statement-breakpoint

ALTER TABLE "repertoire_lines" ALTER COLUMN "line_no" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "repertoire_lines" ADD CONSTRAINT "uq_repertoire_line_no" UNIQUE("repertoire_id","line_no");
