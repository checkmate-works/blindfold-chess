'use client';

import { useCallback } from 'react';

import { useTranslations } from 'next-intl';

import { BoardFrame, BoardSkeleton } from '@/app/_components';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { PositionEditorFields } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionEditorFields';
import type { useFenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';
import type { useTagSelection } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-tag-selection';

import { useEditableBoardLabels } from '../../_hooks/use-editable-board-labels';
import type { PositionFormField } from '../_lib/position-form-validation';

type Props = {
  board: ReturnType<typeof useFenBoardEditor>;
  tags: ReturnType<typeof useTagSelection>;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  pending: boolean;
  availableThemes: ThemeOption[];
  availableChunks: ChunkOption[];
  /**
   * The submit gate's verdict per control (`useSubmitError.messageFor`).
   * Drives the highlight, the `aria-invalid` / `aria-describedby` pair,
   * and the message rendered directly under the control.
   */
  messageFor: (field: PositionFormField) => string | null;
};

/**
 * The shared field body of the create and edit position-memory forms —
 * title, description, board/FEN editor, and the tag picker. Both forms
 * wrap this in their own `<form>` with form-specific banners and submit
 * button. All strings come from the `practice.positionMemory.create`
 * namespace, which both forms reuse.
 *
 * Rendering lives in `PositionEditorFields`, shared with the puzzle
 * authoring form; this component only binds it to this feature's messages
 * and flip semantics.
 */
export function PositionFormFields({
  board,
  tags,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  pending,
  availableThemes,
  availableChunks,
  messageFor,
}: Props) {
  const t = useTranslations('practice.positionMemory.create');

  const boardLabels = useEditableBoardLabels('practice.positionMemory');

  // Position-memory has no separate "side to move" control — the FEN's active
  // color IS the persisted board orientation (isBlackToMoveFromFen drives the
  // flip on every downstream surface: the detail peek board, the memorize
  // screen, and the recreate screen). So the flip button must rewrite the
  // FEN's side-to-move, not merely toggle the visual orientation; otherwise the
  // chosen viewpoint is discarded on save and the session always renders
  // white-at-bottom.
  const handleFlip = useCallback(() => {
    const nextFlipped = !board.flipped;
    board.handleSideToMoveChange(nextFlipped ? 'b' : 'w');
    board.setFlipped(nextFlipped);
  }, [board]);

  return (
    <PositionEditorFields
      t={t}
      board={board}
      boardLabels={boardLabels}
      tags={tags}
      title={title}
      onTitleChange={onTitleChange}
      description={description}
      onDescriptionChange={onDescriptionChange}
      pending={pending}
      availableThemes={availableThemes}
      availableChunks={availableChunks}
      titleError={messageFor('title')}
      fenError={messageFor('fen')}
      onFlip={handleFlip}
      boardSkeleton={
        <BoardFrame>
          <BoardSkeleton />
        </BoardFrame>
      }
    />
  );
}
