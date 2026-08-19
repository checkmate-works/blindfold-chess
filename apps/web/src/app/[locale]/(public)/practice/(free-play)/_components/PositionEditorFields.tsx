'use client';

import { type ReactNode, useState } from 'react';

import { FieldError, FlipBoardButton, fieldBorderClass, fieldErrorProps } from '@/app/_components';
import type { ClientTranslator } from '@/i18n/translator';
import { STARTING_FEN } from '@blindfold-chess/features/chess-core/fen';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { useFenBoardEditor } from '../_hooks/use-fen-board-editor';
import { useTagPickerLabels } from '../_hooks/use-tag-picker-labels';
import type { useTagSelection } from '../_hooks/use-tag-selection';
import { BoardFenTabs } from './BoardFenTabs';
import type { EditableChessBoardLabels } from './EditableChessBoard';
import { EditableChessBoard } from './EditableChessBoard';
import { TagPicker } from './TagPicker';

type Props = {
  /**
   * The feature's own `…create` namespace translator. Position-memory and
   * puzzle keep separate message trees, but both spell these keys the same
   * way (`titleLabel`, `tabBoard`, `clearBoardConfirmTitle`, …), so the
   * shared body can read them without owning either namespace.
   */
  t: ClientTranslator;
  board: ReturnType<typeof useFenBoardEditor>;
  boardLabels: EditableChessBoardLabels;
  tags: ReturnType<typeof useTagSelection>;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  pending: boolean;
  availableThemes: ThemeOption[];
  availableChunks: ChunkOption[];
  /** The submit gate's verdict for the title control, already resolved. */
  titleError: string | null;
  /** The submit gate's verdict for the position, already resolved. */
  fenError: string | null;
  /**
   * What the flip button does. Puzzle only re-orients the view; position-
   * memory also rewrites the FEN's side-to-move, because there the active
   * color IS the persisted orientation.
   */
  onFlip: () => void;
  /** Rendered in place of the board until game preferences have loaded. */
  boardSkeleton: ReactNode;
  /** Slot at the start of the board toolbar (puzzle's side-to-move picker). */
  boardToolbarStart?: ReactNode;
  /** Slot between the position editor and the tag picker (puzzle's turn indicator). */
  afterPositionEditor?: ReactNode;
  /** Slot after the tag picker (puzzle's continue / cancel actions). */
  children?: ReactNode;
};

/**
 * The field body shared by the position-memory and puzzle authoring forms —
 * title, description, the board/FEN editor with its "clear board"
 * confirmation, and the tag picker.
 *
 * Both features render the same controls with the same accessibility wiring;
 * what differs is bounded and passed in as slots (`boardToolbarStart`,
 * `afterPositionEditor`, `children`) plus the flip behaviour. Keeping one
 * copy of the wiring is the point: the `id` / `aria-describedby` /
 * `role="group"` relationships below are easy to break in a way no visual
 * check catches, and they used to exist twice.
 */
export function PositionEditorFields({
  t,
  board,
  boardLabels,
  tags,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  pending,
  availableThemes,
  availableChunks,
  titleError,
  fenError,
  onFlip,
  boardSkeleton,
  boardToolbarStart,
  afterPositionEditor,
  children,
}: Props) {
  const tagPickerLabels = useTagPickerLabels();
  const { preferences, isLoaded } = useGamePreferences();

  const [clearBoardOpen, setClearBoardOpen] = useState(false);

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
              {/* Keeps the flip button hard right when there is no start slot. */}
              {boardToolbarStart ?? <span />}
              <FlipBoardButton onClick={onFlip} title={t('flipBoard')} />
            </div>
            {!isLoaded ? (
              boardSkeleton
            ) : (
              <EditableChessBoard
                fen={board.boardFen}
                onFenChange={board.handleBoardChange}
                labels={boardLabels}
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
              placeholder={STARTING_FEN}
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

      {afterPositionEditor}

      <TagPicker
        selectedThemes={tags.selectedThemes}
        selectedChunks={tags.selectedChunks}
        availableThemes={availableThemes}
        availableChunks={availableChunks}
        disabled={pending}
        onChange={tags.handleTagChange}
        labels={tagPickerLabels}
      />

      {children}

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
