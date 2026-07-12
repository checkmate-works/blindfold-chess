'use client';

import { useRef, useState } from 'react';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { useFenBoardEditor } from '../../_hooks/use-fen-board-editor';
import { useTagSelection } from '../../_hooks/use-tag-selection';
import { useMoveSubmitLabels } from './use-move-submit-labels';
import { usePuzzleSolutionMoves } from './use-puzzle-solution-moves';

type Params = {
  initialFen?: string;
  initialMoves?: string[];
  initialNotes?: string[];
  initialThemes: ThemeOption[];
  initialChunks: ChunkOption[];
};

/**
 * The two-step authoring flow: `position` locks the solution-move UI away
 * while the board is editable, `solution` locks the board read-only while
 * moves are entered. This structurally prevents the board and the solution
 * move list from ever being edited in the same interaction, which used to
 * let a board tweak silently wipe already-entered solution moves.
 */
export type PuzzleFormPhase = 'position' | 'solution';

/**
 * Compose the three puzzle-authoring hooks (board editor, solution-move
 * sequence, tag selection) shared verbatim by CreatePuzzleForm and
 * EditPuzzleForm.
 *
 * `solution` reads `board.baseFen` to validate new moves, and `board` must
 * reset `solution` whenever the position changes — a cycle broken with a ref
 * the board's `onBoardChange` dereferences lazily. Centralising the wiring
 * keeps that subtlety in one place instead of duplicated across both forms.
 *
 * `phase` starts at `'solution'` when `initialFen` is already known at mount
 * (edit form, fork seed, injected `?fen=`) since there is no position left to
 * set up, and `'position'` otherwise (brand-new puzzle). It stays plain
 * `useState` rather than a derived value because callers (draft hydration,
 * "start over") need to move it explicitly when they restore state
 * asynchronously after mount.
 */
export function usePuzzleFormComposition({
  initialFen,
  initialMoves,
  initialNotes,
  initialThemes,
  initialChunks,
}: Params) {
  const moveSubmitLabels = useMoveSubmitLabels();

  const solutionResetRef = useRef<() => void>(() => {});
  const board = useFenBoardEditor({
    initialFen,
    onBoardChange: () => solutionResetRef.current(),
  });
  const solution = usePuzzleSolutionMoves({
    baseFen: board.baseFen,
    initialMoves,
    initialNotes,
    moveSubmitLabels,
  });
  solutionResetRef.current = solution.reset;
  const tags = useTagSelection({
    initialThemes,
    initialChunks,
  });

  const [phase, setPhase] = useState<PuzzleFormPhase>(() => (initialFen ? 'solution' : 'position'));

  return { board, solution, tags, phase, setPhase };
}
