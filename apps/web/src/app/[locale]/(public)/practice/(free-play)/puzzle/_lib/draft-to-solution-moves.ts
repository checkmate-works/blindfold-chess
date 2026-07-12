import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';

/**
 * Map a draft's parallel `moves`/`notes` arrays into the
 * `PuzzleSolutionMove[]` shape the replay and mutation actions expect,
 * trimming blank notes to `null`. Shared by the create and edit preview
 * clients, whose draft payloads both carry `moves` + `notes`.
 */
export function draftToSolutionMoves(draft: {
  moves: string[];
  notes: string[];
}): PuzzleSolutionMove[] {
  return draft.moves.map((san, i) => {
    const raw = draft.notes[i];
    const note = raw && raw.trim().length > 0 ? raw.trim() : null;
    return { san, note };
  });
}
