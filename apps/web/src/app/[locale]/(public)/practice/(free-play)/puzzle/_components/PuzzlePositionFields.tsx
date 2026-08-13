'use client';

import { useTranslations } from 'next-intl';

import { Button, FormActionFooter } from '@/app/_components';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { EditableBoardSkeleton } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableBoardSkeleton';
import { PositionEditorFields } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionEditorFields';

import type { useFenBoardEditor } from '../../_hooks/use-fen-board-editor';
import type { useTagSelection } from '../../_hooks/use-tag-selection';
import { useEditableBoardLabels } from '../_hooks/use-editable-board-labels';
import type { PuzzlePositionField } from '../_lib/validate-puzzle-form';
import { SideToMoveIndicator } from './SideToMoveIndicator';

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
  onContinue: () => void;
  continueLabel: string;
  /**
   * Optional quiet "cancel" text link rendered below the continue button —
   * used by the edit flow to abandon editing and return to the detail page.
   * Omitted by the create flow, which has no detail page to return to.
   */
  onCancel?: () => void;
  cancelLabel?: string;
  /**
   * The submit gate's verdict per control (`useSubmitError.messageFor`).
   * Drives the highlight, the `aria-invalid` / `aria-describedby` pair,
   * and the message rendered directly under the control.
   */
  messageFor: (field: PuzzlePositionField) => string | null;
};

/**
 * The shared field body of the position step — title, description, board/FEN
 * editor, and the tag picker — used by both the create and edit flows'
 * position-step wrapper components. Continue is the only exit; it is up to
 * the caller to decide (via `onContinue`) whether advancing needs a
 * confirmation first (e.g. the position changed under already-entered
 * solution moves) since only the caller tracks that carried-through state.
 *
 * Rendering lives in `PositionEditorFields`, shared with the position-memory
 * authoring form; this component adds what is specific to puzzles — the
 * side-to-move picker, the turn indicator, and the continue / cancel
 * actions — through that component's slots.
 */
export function PuzzlePositionFields({
  board,
  tags,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  pending,
  availableThemes,
  availableChunks,
  onContinue,
  continueLabel,
  onCancel,
  cancelLabel,
  messageFor,
}: Props) {
  const t = useTranslations('practice.puzzle.create');
  const boardLabels = useEditableBoardLabels();

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
      onFlip={board.handleFlip}
      boardSkeleton={<EditableBoardSkeleton />}
      boardToolbarStart={
        <div
          role="radiogroup"
          aria-label={t('sideToMove')}
          className="inline-flex rounded-md border border-border overflow-hidden text-sm"
        >
          <button
            type="button"
            role="radio"
            aria-checked={board.sideToMove === 'w'}
            onClick={() => board.handleSideToMoveChange('w')}
            className={`px-3 py-1.5 transition-colors ${
              board.sideToMove === 'w'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {t('sideWhite')}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={board.sideToMove === 'b'}
            onClick={() => board.handleSideToMoveChange('b')}
            className={`px-3 py-1.5 transition-colors ${
              board.sideToMove === 'b'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {t('sideBlack')}
          </button>
        </div>
      }
      afterPositionEditor={
        board.turnIndicator && (
          <p className="text-sm text-muted-foreground text-center">
            <SideToMoveIndicator turn={board.turnIndicator} />
          </p>
        )
      }
    >
      <FormActionFooter
        cancel={onCancel ? { label: cancelLabel, onClick: onCancel, disabled: pending } : undefined}
      >
        {/*
         * Only `pending` disables this. Blocking the click on an invalid
         * position or an empty title would be silent about which of the
         * two is missing; `onContinue` says so and moves focus there.
         */}
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          disabled={pending}
          onClick={onContinue}
        >
          {continueLabel}
        </Button>
      </FormActionFooter>
    </PositionEditorFields>
  );
}
