'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import {
  Button,
  FieldError,
  FlipBoardButton,
  fieldBorderClass,
  fieldErrorProps,
} from '@/app/_components';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { BoardFenTabs } from '@/app/[locale]/(public)/practice/(free-play)/_components/BoardFenTabs';
import { EditableBoardSkeleton } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableBoardSkeleton';
import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { TagPicker } from '../../_components/TagPicker';
import type { useFenBoardEditor } from '../../_hooks/use-fen-board-editor';
import { useTagPickerLabels } from '../../_hooks/use-tag-picker-labels';
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
 * The "clear board" confirmation is fully self-contained here (button +
 * modal + open state) since it is identical for create and edit.
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
  const tagPickerLabels = useTagPickerLabels();
  const editableBoardLabels = useEditableBoardLabels();
  const { preferences, isLoaded } = useGamePreferences();

  const [clearBoardOpen, setClearBoardOpen] = useState(false);

  const titleError = messageFor('title');
  const fenError = messageFor('fen');

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
            <div className="flex items-center justify-between gap-2 mb-2">
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
              <FlipBoardButton onClick={board.handleFlip} title={t('flipBoard')} />
            </div>
            {!isLoaded ? (
              <EditableBoardSkeleton />
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

      {board.turnIndicator && (
        <p className="text-sm text-muted-foreground text-center">
          <SideToMoveIndicator turn={board.turnIndicator} />
        </p>
      )}

      <TagPicker
        selectedThemes={tags.selectedThemes}
        selectedChunks={tags.selectedChunks}
        availableThemes={availableThemes}
        availableChunks={availableChunks}
        disabled={pending}
        onChange={tags.handleTagChange}
        labels={tagPickerLabels}
      />

      <div className="space-y-4">
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
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        )}
      </div>

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
