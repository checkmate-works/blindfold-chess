'use client';

import { useCallback, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import {
  BoardFrame,
  BoardSkeleton,
  FieldError,
  FlipBoardButton,
  fieldBorderClass,
  fieldErrorProps,
} from '@/app/_components';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { BoardFenTabs } from '@/app/[locale]/(public)/practice/(free-play)/_components/BoardFenTabs';
import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { TagPicker } from '@/app/[locale]/(public)/practice/(free-play)/_components/TagPicker';
import type { useFenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';
import { useTagPickerLabels } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-tag-picker-labels';
import type { useTagSelection } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-tag-selection';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

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
 * The "clear board" confirmation is fully self-contained here (button +
 * modal + open state) since it is identical for create and edit.
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
  const tBoard = useTranslations('practice.positionMemory');
  const tagPickerLabels = useTagPickerLabels();
  const { preferences, isLoaded } = useGamePreferences();

  const [clearBoardOpen, setClearBoardOpen] = useState(false);

  const titleError = messageFor('title');
  const fenError = messageFor('fen');

  const editableBoardLabels = useMemo(
    () => ({
      whitePieces: tBoard('whitePieces'),
      blackPieces: tBoard('blackPieces'),
      removePieceMode: tBoard('removePieceMode'),
      placingPiece: tBoard('placingPiece'),
    }),
    [tBoard]
  );

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
    <>
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          {t('titleLabel')} <span className="text-destructive">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className={`w-full px-3 py-2 rounded border bg-card text-foreground ${fieldBorderClass(titleError)}`}
          required
          {...fieldErrorProps('title-error', titleError)}
        />
        <FieldError id="title-error" message={titleError} />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          {t('descriptionLabel')}
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
        />
      </div>

      {/*
       * `id` + `tabIndex` make the whole position block a focus target: a
       * rejected position has no text input to focus while the board tab
       * is active. See `useSubmitError`.
       */}
      <div
        id="position-editor"
        tabIndex={-1}
        role="group"
        aria-label={t('tabBoard')}
        aria-describedby={fenError && board.activeTab === 'board' ? 'position-error' : undefined}
        className="space-y-6"
      >
        <BoardFenTabs
          activeTab={board.activeTab}
          onTabChange={board.setActiveTab}
          boardLabel={t('tabBoard')}
          fenLabel={t('tabFen')}
        />

        {board.activeTab === 'board' && (
          <>
            <div className="flex justify-end mb-2">
              <FlipBoardButton onClick={handleFlip} title={t('flipBoard')} />
            </div>
            {!isLoaded ? (
              <BoardFrame>
                <BoardSkeleton />
              </BoardFrame>
            ) : (
              <EditableChessBoard
                fen={board.boardFen}
                onFenChange={board.handleBoardChange}
                labels={editableBoardLabels}
                editable={true}
                flipped={board.flipped}
                showCoordinates={true}
                boardTheme={preferences.boardTheme}
              />
            )}

            {/*
             * `fenError` is the submit gate's verdict; `positionError` is
             * the board editor's own live complaint. Either renders here,
             * right under the board that has to change.
             */}
            {(fenError || board.positionError) && (
              <p id="position-error" role="alert" className="text-sm text-destructive text-center">
                {fenError ?? t('positionInvalid')}
              </p>
            )}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setClearBoardOpen(true)}
                className="px-3 py-1 text-sm rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                {t('clearBoard')}
              </button>
            </div>
          </>
        )}

        {board.activeTab === 'fen' && (
          <div>
            <label htmlFor="fen" className="block text-sm font-medium mb-1">
              {t('fenLabel')}
            </label>
            <textarea
              id="fen"
              value={board.fenInput}
              onChange={board.handleFenInputChange}
              placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              rows={2}
              className={`w-full px-3 py-2 rounded border bg-card text-foreground text-sm font-mono ${fieldBorderClass(fenError)}`}
              {...fieldErrorProps('fen-error', fenError)}
            />
            <FieldError
              id="fen-error"
              message={
                fenError ??
                (board.fenInput.trim() !== '' && !board.isFenValid ? t('fenInvalid') : null)
              }
            />
          </div>
        )}
      </div>

      <TagPicker
        selectedThemes={tags.selectedThemes}
        selectedChunks={tags.selectedChunks}
        availableThemes={availableThemes}
        availableChunks={availableChunks}
        disabled={pending}
        onChange={tags.handleTagChange}
        labels={tagPickerLabels}
      />

      <ConfirmationModal
        isOpen={clearBoardOpen}
        title={t('clearBoardConfirmTitle')}
        message={t('clearBoardConfirmMessage')}
        confirmText={t('clearBoardConfirmConfirm')}
        cancelText={t('clearBoardConfirmCancel')}
        confirmVariant="danger"
        onConfirm={() => {
          setClearBoardOpen(false);
          board.handleClearBoard();
        }}
        onCancel={() => setClearBoardOpen(false)}
      />
    </>
  );
}
