-- Consolidate puzzle_solutions into a single `solution_moves` jsonb column
-- that stores per-move SAN + optional note together.
--
-- See tmp/shikigami/phase1.6-design.md §1 for the schema shape rationale.

-- 1. Add the new consolidated column. NOT NULL with a default empty array so
--    existing rows can be updated in place without a temporary nullable window.
ALTER TABLE "puzzle_solutions"
  ADD COLUMN IF NOT EXISTS "solution_moves" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint

-- 2. Backfill existing rows by zipping `solution_line` tokens with any existing
--    `notes` array entries. The idempotency guard ensures re-runs don't clobber
--    rows that were already migrated (safety for future branch-merge scenarios).
--
--    - `string_to_array(solution_line, ' ')` splits on single spaces. All writes
--      through validation go through `solutionLine.trim().split(/\s+/)` and join
--      back with `' '`, so single-space delimiter is the canonical form.
--    - `to_jsonb(ps2)->'notes'` is used instead of a direct `ps2.notes` column
--      reference so that this migration parses and runs in environments where
--      the `notes` column was never applied (e.g. the dev-DB rollback path
--      described in tmp/shikigami/phase1.6-design.md §2.1). When the column
--      exists, `to_jsonb(row)` emits its value; when it doesn't, the `->`
--      lookup yields NULL which `COALESCE` turns into an empty array.
--    - `jsonb_array_element_text(notes, ord-1)` reads the note at the same 0-based
--      index as the move token. When `notes` is shorter than moves (or absent),
--      the LEFT JOIN yields NULL, which becomes the `note` field.
--    - Empty/whitespace notes collapse to NULL, matching the app-layer
--      `normalizePuzzleNotes` behavior.
UPDATE "puzzle_solutions" ps
SET "solution_moves" = sub.moves
FROM (
  SELECT
    ps2.id,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'san', move_token,
          'note',
          CASE
            WHEN note_text IS NULL OR btrim(note_text) = '' THEN NULL
            ELSE btrim(note_text)
          END
        )
        ORDER BY ord
      ),
      '[]'::jsonb
    ) AS moves
  FROM "puzzle_solutions" ps2
  CROSS JOIN LATERAL unnest(string_to_array(ps2.solution_line, ' '))
    WITH ORDINALITY AS t(move_token, ord)
  LEFT JOIN LATERAL (
    SELECT jsonb_array_element_text(
      COALESCE(to_jsonb(ps2)->'notes', '[]'::jsonb),
      (ord - 1)::int
    ) AS note_text
  ) n ON TRUE
  WHERE ps2.solution_line IS NOT NULL
  GROUP BY ps2.id
) sub
WHERE ps.id = sub.id
  AND ps."solution_moves" = '[]'::jsonb;
--> statement-breakpoint

-- 3. Drop the old `notes` column. In local dev post-rollback (§2.1) this column
--    does not exist, so the `IF EXISTS` guard makes this a no-op. In a future
--    environment where C.1 did ship, this drops it.
ALTER TABLE "puzzle_solutions" DROP COLUMN IF EXISTS "notes";
--> statement-breakpoint

-- 4. Drop NOT NULL on `solution_line`. Per Decision A, new rows written by the
--    app leave `solution_line` NULL — the column becomes an archive of the
--    pre-migration denormalized form, and Phase 3 will drop the column outright.
ALTER TABLE "puzzle_solutions" ALTER COLUMN "solution_line" DROP NOT NULL;
