'use client';

import { useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { BoardSkeleton, Button, FlipBoardButton, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';
import { FiInfo } from 'react-icons/fi';

import type { ChunkOption } from '@/lib/chunks/types';
import { PUZZLE_NOTE_MAX_LENGTH } from '@/lib/positions/validation';
import type { ThemeOption } from '@/lib/themes/types';

import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { useEditableBoardLabels } from '../_hooks/use-editable-board-labels';
import { useFenBoardEditor } from '../_hooks/use-fen-board-editor';
import { usePuzzleDraftHydration } from '../_hooks/use-puzzle-draft-hydration';
import { usePuzzleSolutionMoves } from '../_hooks/use-puzzle-solution-moves';
import { usePuzzleTagSelection } from '../_hooks/use-puzzle-tag-selection';
import { useTagPickerLabels } from '../_hooks/use-tag-picker-labels';
import { clearDraft, writeDraft } from '../_lib/draft-storage';
import { EMPTY_BOARD_FEN, MAX_SOLUTION_MOVES } from '../_lib/puzzle-form-constants';
import { PuzzleTagPicker } from './PuzzleTagPicker';
import { SolutionMoveList } from './SolutionMoveList';

function formatLocalIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDefaultTitle(displayName: string | undefined): string {
  if (displayName === undefined) return '';
  const date = formatLocalIsoDate(new Date());
  const trimmed = displayName.trim();
  return trimmed ? `Puzzle ${date} - ${trimmed}` : `Puzzle ${date}`;
}

type Props = {
  /**
   * Author's display name used to seed the default title as
   * `Puzzle YYYY-MM-DD - <displayName>`. When omitted (e.g., in tests),
   * the title starts empty. When passed as an empty string (no profile
   * displayName/username), the date-only fallback `Puzzle YYYY-MM-DD`
   * is used.
   */
  displayName?: string;
  /**
   * Skip the unsaved-changes navigation guard. Used when the form is
   * rendered behind a guest sign-up overlay: the guest cannot submit, so
   * any "dirty" state (e.g. a draft hydrated from a previous logged-in
   * session) is not theirs to lose, and the guard would otherwise block
   * the sign-up CTA click with a modal that makes no sense in context.
   */
  disableUnsavedGuard?: boolean;
  /**
   * Theme + chunk catalog for the tag picker. Loaded server-side so the
   * picker can render immediately without an extra round-trip and so
   * draft hydration can resolve persisted IDs to display labels.
   * Optional with empty defaults so the form stays renderable in tests
   * and on routes that don't supply this data (e.g. the legacy guest
   * gate path before sign-in completes).
   */
  availableThemes?: ThemeOption[];
  availableChunks?: ChunkOption[];
};

export function CreatePuzzleForm({
  displayName,
  disableUnsavedGuard = false,
  availableThemes = [],
  availableChunks = [],
}: Props = {}) {
  const router = useRouter();
  const t = useTranslations('practice.puzzle.create');
  const tPlay = useTranslations('play');
  const tUnsaved = useTranslations('unsavedChanges');
  const tagPickerLabels = useTagPickerLabels();
  const editableBoardLabels = useEditableBoardLabels();
  const { preferences, updatePreferences, isLoaded } = useGamePreferences();

  const defaultTitleRef = useRef(buildDefaultTitle(displayName));
  const [title, setTitle] = useState(defaultTitleRef.current);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startOverOpen, setStartOverOpen] = useState(false);
  const [clearBoardOpen, setClearBoardOpen] = useState(false);

  // Compose the three authoring hooks. `moves` needs `board.baseFen`
  // to validate new moves, and `board` needs to reset `moves` when
  // the position changes — break the cycle with a ref that the
  // board's onBoardChange dereferences lazily.
  const solutionResetRef = useRef<() => void>(() => {});
  const board = useFenBoardEditor({ onBoardChange: () => solutionResetRef.current() });
  const solution = usePuzzleSolutionMoves({ baseFen: board.baseFen });
  solutionResetRef.current = solution.reset;
  const tags = usePuzzleTagSelection();
  const handleMoveSubmit = useMemo(
    () =>
      solution.makeMoveSubmitHandler({
        positionInvalid: t('positionInvalid'),
        maxMovesReached: t('maxMovesReached'),
        invalidMove: tPlay('invalidMove'),
      }),
    // makeMoveSubmitHandler closes over current state (moves, baseFen,
    // currentFen) so re-derive whenever those change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board.baseFen, solution.currentFen, solution.moves, t, tPlay]
  );

  // Resolve draft IDs against the loaded catalog so the picker has full
  // option objects (label + slug + category) to render. IDs not present
  // in the catalog (e.g. a chunk soft-deleted between draft write and
  // hydration) silently drop, since attaching them would fail validation
  // anyway and we'd rather hydrate cleanly than block the author.
  const { hydratedFromDraft, resetHydrated } = usePuzzleDraftHydration({
    apply: (draft) => {
      board.setFenInput(draft.fen);
      board.setBoardFen(draft.fen);
      board.setSideToMove(draft.sideToMove);
      setTitle(draft.title);
      setDescription(draft.description);
      solution.setMoves(draft.moves);
      solution.setNotes(draft.notes);
      board.setActiveTab(draft.activeTab);
      board.setFlipped(draft.flipped);
      board.setUserFlipped(draft.userFlipped);
      if (draft.themeIds && draft.themeIds.length > 0) {
        const resolved = draft.themeIds
          .map((id) => availableThemes.find((t) => t.id === id))
          .filter((t): t is ThemeOption => t !== undefined);
        tags.setSelectedThemes(resolved);
      }
      if (draft.chunkIds && draft.chunkIds.length > 0) {
        const resolved = draft.chunkIds
          .map((id) => availableChunks.find((c) => c.id === id))
          .filter((c): c is ChunkOption => c !== undefined);
        tags.setSelectedChunks(resolved);
      }
    },
  });

  const isDirty =
    !submitted &&
    (title.trim() !== defaultTitleRef.current.trim() ||
      description.trim() !== '' ||
      solution.moves.length > 0 ||
      solution.notes.some((n) => n.trim() !== '') ||
      (board.fenInput.trim() !== '' && board.fenInput !== EMPTY_BOARD_FEN) ||
      tags.selectedThemes.length > 0 ||
      tags.selectedChunks.length > 0);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({
    isDirty: disableUnsavedGuard ? false : isDirty,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    board.setPositionError(false);
    solution.setSolutionError(null);

    if (!board.trimmedFen || !board.isFenValid) {
      board.setPositionError(true);
      return;
    }

    if (solution.moves.length === 0) {
      solution.setSolutionError(t('solutionRequired'));
      return;
    }

    setPending(true);

    // Persist authoring state to sessionStorage and hand off to the preview
    // step. The actual `createPuzzle` Server Action is invoked from the
    // preview page's "Create" CTA. If the draft write fails (quota / private
    // mode), stay on the form and surface an error — navigating to a preview
    // that would immediately bounce back is worse UX.
    const ok = writeDraft({
      version: 1,
      fen: board.trimmedFen,
      title,
      description,
      moves: solution.moves,
      notes: solution.notes,
      activeTab: board.activeTab,
      sideToMove: board.sideToMove,
      flipped: board.flipped,
      userFlipped: board.userFlipped,
      themeIds: tags.selectedThemes.map((t) => t.id),
      chunkIds: tags.selectedChunks.map((c) => c.id),
    });
    if (!ok) {
      setError(t('draftWriteFailed'));
      setPending(false);
      return;
    }

    // flushSync ensures the re-render (isDirty -> false) completes before
    // router.push triggers the navigation guard check — otherwise the
    // intentional push would fire the UnsavedChangesDialog.
    flushSync(() => setSubmitted(true));
    router.push('/practice/puzzle/new/preview');
  }

  function handleStartOver() {
    clearDraft();
    board.resetBoard();
    solution.reset();
    tags.reset();
    setTitle(defaultTitleRef.current);
    setDescription('');
    setError(null);
    resetHydrated();
    setStartOverOpen(false);
  }

  const reachedMaxMoves = solution.moves.length >= MAX_SOLUTION_MOVES;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
            {error}
          </div>
        )}

        {hydratedFromDraft && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary px-3 py-2 text-sm"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <FiInfo className="h-4 w-4 flex-shrink-0" aria-hidden />
              <span>{t('draftRestoredBanner')}</span>
            </div>
            <button
              type="button"
              onClick={() => setStartOverOpen(true)}
              className="rounded border border-destructive px-2 py-1 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              {t('draftRestoredDiscard')}
            </button>
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            {t('titleLabel')} <span className="text-destructive">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
            onChange={(e) => setDescription(e.target.value)}
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
                onSubmit={handleMoveSubmit}
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

        <PuzzleTagPicker
          selectedThemes={tags.selectedThemes}
          selectedChunks={tags.selectedChunks}
          availableThemes={availableThemes}
          availableChunks={availableChunks}
          disabled={pending}
          onChange={tags.handleTagChange}
          labels={tagPickerLabels}
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={
            pending || !board.isFenValid || solution.moves.length === 0 || title.trim() === ''
          }
        >
          {t('continueToPreview')}
        </Button>
      </form>

      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={confirm}
        onCancel={cancel}
        title={tUnsaved('title')}
        message={tUnsaved('message')}
        confirmLabel={tUnsaved('confirm')}
        cancelLabel={tUnsaved('cancel')}
      />

      <ConfirmationModal
        isOpen={startOverOpen}
        title={t('startOverConfirmTitle')}
        message={t('startOverConfirmMessage')}
        confirmText={t('startOverConfirm')}
        cancelText={t('startOverCancel')}
        confirmVariant="danger"
        onConfirm={handleStartOver}
        onCancel={() => setStartOverOpen(false)}
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
