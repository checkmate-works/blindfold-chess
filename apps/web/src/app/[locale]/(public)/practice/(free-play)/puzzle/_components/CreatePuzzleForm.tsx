'use client';

import { useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { BoardSkeleton, Button, FlipBoardButton, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';
import { FiInfo } from 'react-icons/fi';

import { PUZZLE_NOTE_MAX_LENGTH } from '@/lib/positions/validation';

import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { useEditableBoardLabels } from '../_hooks/use-editable-board-labels';
import { usePuzzleAuthoringState } from '../_hooks/use-puzzle-authoring-state';
import { usePuzzleDraftHydration } from '../_hooks/use-puzzle-draft-hydration';
import { useTagPickerLabels } from '../_hooks/use-tag-picker-labels';
import { clearDraft, writeDraft } from '../_lib/draft-storage';
import type { ChunkOption, ThemeOption } from '../_lib/load-puzzle-tags';
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

  const form = usePuzzleAuthoringState();
  const handleMoveSubmit = useMemo(
    () =>
      form.makeMoveSubmitHandler({
        positionInvalid: t('positionInvalid'),
        maxMovesReached: t('maxMovesReached'),
        invalidMove: tPlay('invalidMove'),
      }),
    // makeMoveSubmitHandler closes over current state (moves, baseFen,
    // currentFen) so re-derive whenever those change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.baseFen, form.currentFen, form.moves, t, tPlay]
  );

  // Resolve draft IDs against the loaded catalog so the picker has full
  // option objects (label + slug + category) to render. IDs not present
  // in the catalog (e.g. a chunk soft-deleted between draft write and
  // hydration) silently drop, since attaching them would fail validation
  // anyway and we'd rather hydrate cleanly than block the author.
  const { hydratedFromDraft, resetHydrated } = usePuzzleDraftHydration({
    apply: (draft) => {
      form.setFenInput(draft.fen);
      form.setBoardFen(draft.fen);
      form.setSideToMove(draft.sideToMove);
      setTitle(draft.title);
      setDescription(draft.description);
      form.setMoves(draft.moves);
      form.setNotes(draft.notes);
      form.setActiveTab(draft.activeTab);
      form.setFlipped(draft.flipped);
      form.setUserFlipped(draft.userFlipped);
      if (draft.themeIds && draft.themeIds.length > 0) {
        const resolved = draft.themeIds
          .map((id) => availableThemes.find((t) => t.id === id))
          .filter((t): t is ThemeOption => t !== undefined);
        form.setSelectedThemes(resolved);
      }
      if (draft.chunkIds && draft.chunkIds.length > 0) {
        const resolved = draft.chunkIds
          .map((id) => availableChunks.find((c) => c.id === id))
          .filter((c): c is ChunkOption => c !== undefined);
        form.setSelectedChunks(resolved);
      }
    },
  });

  const isDirty =
    !submitted &&
    (title.trim() !== defaultTitleRef.current.trim() ||
      description.trim() !== '' ||
      form.moves.length > 0 ||
      form.notes.some((n) => n.trim() !== '') ||
      (form.fenInput.trim() !== '' && form.fenInput !== EMPTY_BOARD_FEN) ||
      form.selectedThemes.length > 0 ||
      form.selectedChunks.length > 0);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({
    isDirty: disableUnsavedGuard ? false : isDirty,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    form.setPositionError(false);
    form.setSolutionError(null);

    if (!form.trimmedFen || !form.isFenValid) {
      form.setPositionError(true);
      return;
    }

    if (form.moves.length === 0) {
      form.setSolutionError(t('solutionRequired'));
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
      fen: form.trimmedFen,
      title,
      description,
      moves: form.moves,
      notes: form.notes,
      activeTab: form.activeTab,
      sideToMove: form.sideToMove,
      flipped: form.flipped,
      userFlipped: form.userFlipped,
      themeIds: form.selectedThemes.map((t) => t.id),
      chunkIds: form.selectedChunks.map((c) => c.id),
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
    form.resetToInitial();
    setTitle(defaultTitleRef.current);
    setDescription('');
    setError(null);
    resetHydrated();
    setStartOverOpen(false);
  }

  const reachedMaxMoves = form.moves.length >= MAX_SOLUTION_MOVES;

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
            aria-selected={form.activeTab === 'board'}
            onClick={() => form.setActiveTab('board')}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              form.activeTab === 'board'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('tabBoard')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={form.activeTab === 'fen'}
            onClick={() => form.setActiveTab('fen')}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              form.activeTab === 'fen'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('tabFen')}
          </button>
        </nav>

        {form.activeTab === 'board' && (
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
                  aria-checked={form.sideToMove === 'w'}
                  onClick={() => form.handleSideToMoveChange('w')}
                  className={`px-3 py-1.5 transition-colors ${
                    form.sideToMove === 'w'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t('sideWhite')}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.sideToMove === 'b'}
                  onClick={() => form.handleSideToMoveChange('b')}
                  className={`px-3 py-1.5 transition-colors ${
                    form.sideToMove === 'b'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t('sideBlack')}
                </button>
              </div>
              <FlipBoardButton onClick={form.handleFlip} title={t('flipBoard')} />
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                {!isLoaded ? (
                  <BoardSkeleton />
                ) : (
                  <EditableChessBoard
                    fen={form.boardFen}
                    onFenChange={form.handleBoardChange}
                    labels={editableBoardLabels}
                    editable={true}
                    flipped={form.flipped}
                    showCoordinates={true}
                    boardTheme={preferences.boardTheme}
                  />
                )}
              </div>
            </div>

            {form.positionError && (
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

        {form.activeTab === 'fen' && (
          <div>
            <label htmlFor="fen" className="block text-sm font-medium mb-1">
              {t('fenLabel')}
            </label>
            <textarea
              id="fen"
              value={form.fenInput}
              onChange={form.handleFenInputChange}
              placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              rows={2}
              className="w-full px-3 py-2 rounded border border-border bg-card text-foreground text-sm font-mono"
            />
            {form.fenInput.trim() && !form.isFenValid && (
              <p className="text-sm text-destructive mt-1">{t('fenInvalid')}</p>
            )}
          </div>
        )}

        {form.turnIndicator && (
          <p className="text-sm text-muted-foreground text-center">
            <span aria-hidden className="mr-1">
              {form.turnIndicator === 'w' ? '⚪' : '⚫'}
            </span>
            {form.turnIndicator === 'w' ? t('whiteToMove') : t('blackToMove')}
          </p>
        )}

        {form.isFenValid && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <label className="text-sm font-medium">
                {t('solutionSection')} <span className="text-destructive">*</span>
              </label>
              <span className="text-xs text-muted-foreground">
                {form.moves.length} / {MAX_SOLUTION_MOVES}
              </span>
            </div>

            {form.moves.length > 0 && (
              <SolutionMoveList
                moves={form.moves}
                firstTurn={form.firstTurn}
                onRemoveLast={form.handleRemoveLast}
                removeAriaLabel={t('removeLastMove', { move: form.moves[form.moves.length - 1]! })}
                disabled={pending}
                renderAfter={(index) => (
                  <input
                    type="text"
                    value={form.notes[index] ?? ''}
                    onChange={(e) => form.handleNoteChange(index, e.target.value)}
                    maxLength={PUZZLE_NOTE_MAX_LENGTH}
                    placeholder={t('addMoveNote')}
                    aria-label={t('noteAriaLabel', { move: form.moves[index]! })}
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
                currentFen={form.currentFen}
                moveInput={form.moveInput}
                onMoveInputChange={form.setMoveInput}
                error={form.moveError}
                onErrorClear={() => form.setMoveError(null)}
                onSubmit={handleMoveSubmit}
                disabled={pending}
                inputPlaceholder={t('movePlaceholder')}
                selectPlaceholder={tPlay('selectMove')}
                toggleTitle={tPlay('switchInputMode')}
                playerColor={form.currentTurn}
                showLegalMovesHint={false}
              />
            )}

            {form.solutionError && <p className="text-sm text-destructive">{form.solutionError}</p>}
          </div>
        )}

        <PuzzleTagPicker
          selectedThemes={form.selectedThemes}
          selectedChunks={form.selectedChunks}
          availableThemes={availableThemes}
          availableChunks={availableChunks}
          disabled={pending}
          onChange={form.handleTagChange}
          labels={tagPickerLabels}
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={pending || !form.isFenValid || form.moves.length === 0 || title.trim() === ''}
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
          form.handleClearBoard();
        }}
        onCancel={() => setClearBoardOpen(false)}
      />
    </>
  );
}
