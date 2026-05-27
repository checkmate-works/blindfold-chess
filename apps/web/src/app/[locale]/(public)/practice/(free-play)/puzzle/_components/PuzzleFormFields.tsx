'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { BoardSkeleton, FlipBoardButton } from '@/app/_components';

import type { ChunkOption } from '@/lib/chunks/types';
import { PUZZLE_NOTE_MAX_LENGTH } from '@/lib/positions/validation';
import type { ThemeOption } from '@/lib/themes/types';

import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { TagPicker } from '../../_components/TagPicker';
import type { useFenBoardEditor } from '../../_hooks/use-fen-board-editor';
import { useTagPickerLabels } from '../../_hooks/use-tag-picker-labels';
import type { useTagSelection } from '../../_hooks/use-tag-selection';
import { useEditableBoardLabels } from '../_hooks/use-editable-board-labels';
import type { usePuzzleSolutionMoves } from '../_hooks/use-puzzle-solution-moves';
import { MAX_SOLUTION_MOVES } from '../_hooks/use-puzzle-solution-moves';
import { SolutionMoveList } from './SolutionMoveList';

type Props = {
  board: ReturnType<typeof useFenBoardEditor>;
  solution: ReturnType<typeof usePuzzleSolutionMoves>;
  tags: ReturnType<typeof useTagSelection>;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  pending: boolean;
  availableThemes: ThemeOption[];
  availableChunks: ChunkOption[];
};

/**
 * The shared field body of the create and edit puzzle forms — title,
 * description, board/FEN editor, solution move list, and the tag picker.
 * Both forms wrap this in their own `<form>` with form-specific banners,
 * submit button, and navigation guards. All strings come from the
 * `practice.puzzle.create` namespace, which both forms reuse.
 *
 * The "clear board" confirmation is fully self-contained here (button +
 * modal + open state) since it is identical for create and edit.
 */
export function PuzzleFormFields({
  board,
  solution,
  tags,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  pending,
  availableThemes,
  availableChunks,
}: Props) {
  const t = useTranslations('practice.puzzle.create');
  const tPlay = useTranslations('play');
  const tagPickerLabels = useTagPickerLabels();
  const editableBoardLabels = useEditableBoardLabels();
  const { preferences, updatePreferences, isLoaded } = useGamePreferences();

  const [clearBoardOpen, setClearBoardOpen] = useState(false);

  const reachedMaxMoves = solution.moves.length >= MAX_SOLUTION_MOVES;

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
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
          required
        />
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

      {/* Tab switcher — matches LeaderboardTabs style */}
      <nav className="flex rounded-lg bg-secondary p-1" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={board.activeTab === 'board'}
          onClick={() => board.setActiveTab('board')}
          className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
            board.activeTab === 'board'
              ? 'bg-card text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('tabBoard')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={board.activeTab === 'fen'}
          onClick={() => board.setActiveTab('fen')}
          className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
            board.activeTab === 'fen'
              ? 'bg-card text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('tabFen')}
        </button>
      </nav>

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
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              {!isLoaded ? (
                <BoardSkeleton />
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
            </div>
          </div>

          {board.positionError && (
            <p className="text-sm text-destructive text-center">{t('positionInvalid')}</p>
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
            className="w-full px-3 py-2 rounded border border-border bg-card text-foreground text-sm font-mono"
          />
          {board.fenInput.trim() && !board.isFenValid && (
            <p className="text-sm text-destructive mt-1">{t('fenInvalid')}</p>
          )}
        </div>
      )}

      {board.turnIndicator && (
        <p className="text-sm text-muted-foreground text-center">
          <span aria-hidden className="mr-1">
            {board.turnIndicator === 'w' ? '⚪' : '⚫'}
          </span>
          {board.turnIndicator === 'w' ? t('whiteToMove') : t('blackToMove')}
        </p>
      )}

      {board.isFenValid && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <label className="text-sm font-medium">
              {t('solutionSection')} <span className="text-destructive">*</span>
            </label>
            <span className="text-xs text-muted-foreground">
              {solution.moves.length} / {MAX_SOLUTION_MOVES}
            </span>
          </div>

          {solution.moves.length > 0 && (
            <SolutionMoveList
              moves={solution.moves}
              firstTurn={solution.firstTurn}
              onRemoveLast={solution.handleRemoveLast}
              removeAriaLabel={t('removeLastMove', {
                move: solution.moves[solution.moves.length - 1]!,
              })}
              disabled={pending}
              renderAfter={(index) => (
                <input
                  type="text"
                  value={solution.notes[index] ?? ''}
                  onChange={(e) => solution.handleNoteChange(index, e.target.value)}
                  maxLength={PUZZLE_NOTE_MAX_LENGTH}
                  placeholder={t('addMoveNote')}
                  aria-label={t('noteAriaLabel', { move: solution.moves[index]! })}
                  className="w-full px-2 py-1 rounded border border-border bg-card text-foreground text-sm"
                />
              )}
            />
          )}

          {reachedMaxMoves ? (
            <p className="text-sm text-muted-foreground">{t('maxMovesReached')}</p>
          ) : (
            <MoveInputPanel
              preferences={preferences}
              updatePreferences={updatePreferences}
              currentFen={solution.currentFen}
              moveInput={solution.moveInput}
              onMoveInputChange={solution.setMoveInput}
              error={solution.moveError}
              onErrorClear={() => solution.setMoveError(null)}
              onSubmit={solution.handleMoveSubmit}
              disabled={pending}
              inputPlaceholder={t('movePlaceholder')}
              selectPlaceholder={tPlay('selectMove')}
              toggleTitle={tPlay('switchInputMode')}
              playerColor={solution.currentTurn}
              showLegalMovesHint={false}
            />
          )}

          {solution.solutionError && (
            <p className="text-sm text-destructive">{solution.solutionError}</p>
          )}
        </div>
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
