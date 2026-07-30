'use client';

import { DeletePositionEntryButton } from '@/app/[locale]/(public)/practice/(free-play)/_components/DeletePositionEntryButton';

import { deletePuzzle } from '../_actions/deletePuzzle';

type Props = {
  puzzleId: string;
  locale: string;
};

/**
 * Owner-side delete entry for the puzzle detail page's "⋯" overflow menu —
 * {@link DeletePositionEntryButton} wired to `deletePuzzle`.
 */
export function DeletePuzzleButton({ puzzleId, locale }: Props) {
  return (
    <DeletePositionEntryButton
      namespace="practice.puzzle.delete"
      onDelete={() => deletePuzzle(puzzleId, locale)}
      redirectPath={`/${locale}/practice/puzzle?toast=puzzle_deleted`}
    />
  );
}
