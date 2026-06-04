'use client';

import { useRef } from 'react';

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
 * Compose the three puzzle-authoring hooks (board editor, solution-move
 * sequence, tag selection) shared verbatim by CreatePuzzleForm and
 * EditPuzzleForm.
 *
 * `solution` reads `board.baseFen` to validate new moves, and `board` must
 * reset `solution` whenever the position changes — a cycle broken with a ref
 * the board's `onBoardChange` dereferences lazily. Centralising the wiring
 * keeps that subtlety in one place instead of duplicated across both forms.
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

  return { board, solution, tags };
}
