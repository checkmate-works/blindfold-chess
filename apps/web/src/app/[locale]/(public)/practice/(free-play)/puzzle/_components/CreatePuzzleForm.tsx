'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { BoardSkeleton, Button, FlipBoardButton, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { executeMove, getTurnFromFen, validateFen } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { flushSync } from 'react-dom';
import { FiInfo } from 'react-icons/fi';

import { PUZZLE_NOTE_MAX_LENGTH } from '@/lib/positions/validation';

import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { usePuzzleDraftHydration } from '../_hooks/use-puzzle-draft-hydration';
import { clearDraft, writeDraft } from '../_lib/draft-storage';
import type { ChunkOption, ThemeOption } from '../_lib/load-puzzle-tags';
import { PuzzleTagPicker } from './PuzzleTagPicker';
import { SolutionMoveList } from './SolutionMoveList';

const EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';
const MAX_SOLUTION_MOVES = 20;

type EditorTab = 'board' | 'fen';
type SideToMove = 'w' | 'b';

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

function replaceSideToMove(fen: string, side: SideToMove): string {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 2) return fen;
  parts[1] = side;
  return parts.join(' ');
}

function readSideToMove(fen: string): SideToMove {
  const parts = fen.trim().split(/\s+/);
  return parts[1] === 'b' ? 'b' : 'w';
}

export function CreatePuzzleForm({
  displayName,
  disableUnsavedGuard = false,
  availableThemes = [],
  availableChunks = [],
}: Props = {}) {
  const router = useRouter();
  const t = useTranslations('practice.puzzle.create');
  const tBoard = useTranslations('practice.puzzle');
  const tTags = useTranslations('practice.puzzle.tags');
  const tPlay = useTranslations('play');
  const tUnsaved = useTranslations('unsavedChanges');
  const { preferences, updatePreferences, isLoaded } = useGamePreferences();

  const defaultTitleRef = useRef(buildDefaultTitle(displayName));
  const [fenInput, setFenInput] = useState('');
  const [boardFen, setBoardFen] = useState(EMPTY_BOARD_FEN);
  const [sideToMove, setSideToMove] = useState<SideToMove>('w');
  const [title, setTitle] = useState(defaultTitleRef.current);
  const [description, setDescription] = useState('');
  const [moves, setMoves] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [moveInput, setMoveInput] = useState('');
  const [moveError, setMoveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [positionError, setPositionError] = useState(false);
  const [solutionError, setSolutionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>('board');
  const [flipped, setFlipped] = useState(false);
  const [userFlipped, setUserFlipped] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startOverOpen, setStartOverOpen] = useState(false);
  const [clearBoardOpen, setClearBoardOpen] = useState(false);
  const [selectedThemes, setSelectedThemes] = useState<ThemeOption[]>([]);
  const [selectedChunks, setSelectedChunks] = useState<ChunkOption[]>([]);

  const handleTagChange = useCallback((themes: ThemeOption[], chunks: ChunkOption[]) => {
    setSelectedThemes(themes);
    setSelectedChunks(chunks);
  }, []);

  // Resolve draft IDs against the loaded catalog so the picker has full
  // option objects (label + slug + category) to render. IDs not present
  // in the catalog (e.g. a chunk soft-deleted between draft write and
  // hydration) silently drop, since attaching them would fail validation
  // anyway and we'd rather hydrate cleanly than block the author.
  const tagPickerLabels = useMemo(
    () => ({
      section: tTags('section'),
      help: tTags('help'),
      placeholder: tTags('placeholder'),
      badgeTheme: tTags('badge.theme'),
      badgeChunk: tTags('badge.chunk'),
      noResults: tTags('noResults'),
      remove: (label: string) => tTags('remove', { label }),
      openDetail: (label: string) => tTags('openDetail', { label }),
      moreItemsHint: (count: number) => tTags('moreItemsHint', { count }),
      detail: {
        readingPrefix: tTags('detail.readingPrefix'),
        noDescription: tTags('detail.noDescription'),
        viewInGlossary: tTags('detail.viewInGlossary'),
        viewChunkPage: tTags('detail.viewChunkPage'),
        detach: tTags('detail.detach'),
        close: tTags('detail.close'),
      },
    }),
    [tTags]
  );

  const { hydratedFromDraft, resetHydrated } = usePuzzleDraftHydration({
    apply: (draft) => {
      setFenInput(draft.fen);
      setBoardFen(draft.fen);
      setSideToMove(draft.sideToMove);
      setTitle(draft.title);
      setDescription(draft.description);
      setMoves(draft.moves);
      setNotes(draft.notes);
      setActiveTab(draft.activeTab);
      setFlipped(draft.flipped);
      setUserFlipped(draft.userFlipped);
      if (draft.themeIds && draft.themeIds.length > 0) {
        const resolved = draft.themeIds
          .map((id) => availableThemes.find((t) => t.id === id))
          .filter((t): t is ThemeOption => t !== undefined);
        setSelectedThemes(resolved);
      }
      if (draft.chunkIds && draft.chunkIds.length > 0) {
        const resolved = draft.chunkIds
          .map((id) => availableChunks.find((c) => c.id === id))
          .filter((c): c is ChunkOption => c !== undefined);
        setSelectedChunks(resolved);
      }
    },
  });

  const trimmedFen = fenInput.trim();
  const isFenValid = trimmedFen !== '' && validateFen(trimmedFen);

  const baseFen = isFenValid ? trimmedFen : '';

  // Derive currentFen by replaying the entered moves on top of baseFen.
  // On any replay failure we stop, returning the last good FEN — handleSubmit
  // already guarantees moves were accepted by executeMove, so this is defensive.
  const currentFen = useMemo(() => {
    if (!baseFen) return '';
    let fen = baseFen;
    for (const move of moves) {
      const r = executeMove(fen, move);
      if (!r) return fen;
      fen = r.fen;
    }
    return fen;
  }, [baseFen, moves]);

  const firstTurn: SideToMove = useMemo(() => {
    if (!baseFen) return 'w';
    try {
      return getTurnFromFen(baseFen) as SideToMove;
    } catch {
      return 'w';
    }
  }, [baseFen]);

  // Side to move at the *current* position along the line. This is what
  // drives ButtonInput's piece-icon color: the pieces displayed should
  // belong to whichever side is about to play next, which alternates as
  // moves are appended. `firstTurn` only reflects the puzzle's starting
  // side and would leave the icons stale after the first move.
  const currentTurn: SideToMove = useMemo(() => {
    if (!currentFen) return firstTurn;
    try {
      return getTurnFromFen(currentFen) as SideToMove;
    } catch {
      return firstTurn;
    }
  }, [currentFen, firstTurn]);

  const isDirty =
    !submitted &&
    (title.trim() !== defaultTitleRef.current.trim() ||
      description.trim() !== '' ||
      moves.length > 0 ||
      notes.some((n) => n.trim() !== '') ||
      (fenInput.trim() !== '' && fenInput !== EMPTY_BOARD_FEN) ||
      selectedThemes.length > 0 ||
      selectedChunks.length > 0);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({
    isDirty: disableUnsavedGuard ? false : isDirty,
  });

  const handleFlip = useCallback(() => {
    setFlipped((prev) => !prev);
    setUserFlipped(true);
  }, []);

  const turnIndicator = useMemo(() => {
    if (!isFenValid) return null;
    try {
      return getTurnFromFen(trimmedFen);
    } catch {
      return null;
    }
  }, [trimmedFen, isFenValid]);

  const editableBoardLabels = useMemo(
    () => ({
      whitePieces: tBoard('whitePieces'),
      blackPieces: tBoard('blackPieces'),
      removePieceMode: tBoard('removePieceMode'),
      placingPiece: tBoard('placingPiece'),
    }),
    [tBoard]
  );

  function resetSolutionState() {
    setMoves([]);
    setNotes([]);
    setMoveInput('');
    setMoveError(null);
    setSolutionError(null);
  }

  function handleFenInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setFenInput(value);
    if (value.trim() !== '' && validateFen(value.trim())) {
      setBoardFen(value.trim());
      setSideToMove(readSideToMove(value.trim()));
    }
    resetSolutionState();
  }

  function handleBoardChange(newFen: string) {
    const withSide = replaceSideToMove(newFen, sideToMove);
    setFenInput(withSide);
    setBoardFen(withSide);
    setPositionError(false);
    resetSolutionState();
  }

  // Reset board state directly: EMPTY_BOARD_FEN fails validateFen's
  // king-count check, so the usual FEN-validation path would skip
  // setBoardFen. For this known-good reset we bypass validation.
  function handleClearBoard() {
    setFenInput(EMPTY_BOARD_FEN);
    setBoardFen(EMPTY_BOARD_FEN);
    setSideToMove('w');
    setPositionError(false);
    setError(null);
    resetSolutionState();
  }

  function handleSideToMoveChange(next: SideToMove) {
    if (next === sideToMove) return;
    setSideToMove(next);
    const sourceFen = boardFen && validateFen(boardFen) ? boardFen : EMPTY_BOARD_FEN;
    const updated = replaceSideToMove(sourceFen, next);
    setBoardFen(updated);
    setFenInput(updated);
    if (next === 'b' && !userFlipped) {
      setFlipped(true);
    }
    resetSolutionState();
  }

  function handleMoveSubmit(move: AlgebraicNotation): boolean {
    const trimmed = move.trim();
    if (!trimmed) return false;
    if (!baseFen) {
      setMoveError(t('positionInvalid'));
      return false;
    }
    if (moves.length >= MAX_SOLUTION_MOVES) {
      setMoveError(t('maxMovesReached'));
      return false;
    }
    const r = executeMove(currentFen, trimmed);
    if (!r) {
      setMoveError(tPlay('invalidMove'));
      return false;
    }
    setMoves((prev) => [...prev, trimmed]);
    setNotes((prev) => [...prev, '']);
    setMoveInput('');
    setMoveError(null);
    setSolutionError(null);
    return true;
  }

  function handleRemoveLast() {
    setMoves((prev) => prev.slice(0, -1));
    setNotes((prev) => prev.slice(0, -1));
    setMoveError(null);
    setSolutionError(null);
  }

  function handleNoteChange(index: number, value: string) {
    setNotes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPositionError(false);
    setSolutionError(null);

    if (!trimmedFen || !isFenValid) {
      setPositionError(true);
      return;
    }

    if (moves.length === 0) {
      setSolutionError(t('solutionRequired'));
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
      fen: trimmedFen,
      title,
      description,
      moves,
      notes,
      activeTab,
      sideToMove,
      flipped,
      userFlipped,
      themeIds: selectedThemes.map((t) => t.id),
      chunkIds: selectedChunks.map((c) => c.id),
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
    setFenInput('');
    setBoardFen(EMPTY_BOARD_FEN);
    setSideToMove('w');
    setTitle(defaultTitleRef.current);
    setDescription('');
    setMoves([]);
    setNotes([]);
    setMoveInput('');
    setMoveError(null);
    setError(null);
    setPositionError(false);
    setSolutionError(null);
    setActiveTab('board');
    setFlipped(false);
    setUserFlipped(false);
    setSelectedThemes([]);
    setSelectedChunks([]);
    resetHydrated();
    setStartOverOpen(false);
  }

  const reachedMaxMoves = moves.length >= MAX_SOLUTION_MOVES;

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
            aria-selected={activeTab === 'board'}
            onClick={() => setActiveTab('board')}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              activeTab === 'board'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('tabBoard')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'fen'}
            onClick={() => setActiveTab('fen')}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              activeTab === 'fen'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('tabFen')}
          </button>
        </nav>

        {/* Board editor tab */}
        {activeTab === 'board' && (
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
                  aria-checked={sideToMove === 'w'}
                  onClick={() => handleSideToMoveChange('w')}
                  className={`px-3 py-1.5 transition-colors ${
                    sideToMove === 'w'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t('sideWhite')}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={sideToMove === 'b'}
                  onClick={() => handleSideToMoveChange('b')}
                  className={`px-3 py-1.5 transition-colors ${
                    sideToMove === 'b'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t('sideBlack')}
                </button>
              </div>
              <FlipBoardButton onClick={handleFlip} title={t('flipBoard')} />
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                {!isLoaded ? (
                  <BoardSkeleton />
                ) : (
                  <EditableChessBoard
                    fen={boardFen}
                    onFenChange={handleBoardChange}
                    labels={editableBoardLabels}
                    editable={true}
                    flipped={flipped}
                    showCoordinates={true}
                    boardTheme={preferences.boardTheme}
                  />
                )}
              </div>
            </div>

            {positionError && (
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

        {/* FEN input tab */}
        {activeTab === 'fen' && (
          <div>
            <label htmlFor="fen" className="block text-sm font-medium mb-1">
              {t('fenLabel')}
            </label>
            <textarea
              id="fen"
              value={fenInput}
              onChange={handleFenInputChange}
              placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              rows={2}
              className="w-full px-3 py-2 rounded border border-border bg-card text-foreground text-sm font-mono"
            />
            {fenInput.trim() && !isFenValid && (
              <p className="text-sm text-destructive mt-1">{t('fenInvalid')}</p>
            )}
          </div>
        )}

        {/* Turn indicator */}
        {turnIndicator && (
          <p className="text-sm text-muted-foreground text-center">
            <span aria-hidden className="mr-1">
              {turnIndicator === 'w' ? '⚪' : '⚫'}
            </span>
            {turnIndicator === 'w' ? t('whiteToMove') : t('blackToMove')}
          </p>
        )}

        {isFenValid && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <label className="text-sm font-medium">
                {t('solutionSection')} <span className="text-destructive">*</span>
              </label>
              <span className="text-xs text-muted-foreground">
                {moves.length} / {MAX_SOLUTION_MOVES}
              </span>
            </div>

            {moves.length > 0 && (
              <SolutionMoveList
                moves={moves}
                firstTurn={firstTurn}
                onRemoveLast={handleRemoveLast}
                removeAriaLabel={t('removeLastMove', { move: moves[moves.length - 1]! })}
                disabled={pending}
                renderAfter={(index) => (
                  <input
                    type="text"
                    value={notes[index] ?? ''}
                    onChange={(e) => handleNoteChange(index, e.target.value)}
                    maxLength={PUZZLE_NOTE_MAX_LENGTH}
                    placeholder={t('addMoveNote')}
                    aria-label={t('noteAriaLabel', { move: moves[index]! })}
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
                currentFen={currentFen}
                moveInput={moveInput}
                onMoveInputChange={setMoveInput}
                error={moveError}
                onErrorClear={() => setMoveError(null)}
                onSubmit={handleMoveSubmit}
                disabled={pending}
                inputPlaceholder={t('movePlaceholder')}
                selectPlaceholder={tPlay('selectMove')}
                toggleTitle={tPlay('switchInputMode')}
                playerColor={currentTurn}
                showLegalMovesHint={false}
              />
            )}

            {solutionError && <p className="text-sm text-destructive">{solutionError}</p>}
          </div>
        )}

        <PuzzleTagPicker
          selectedThemes={selectedThemes}
          selectedChunks={selectedChunks}
          availableThemes={availableThemes}
          availableChunks={availableChunks}
          disabled={pending}
          onChange={handleTagChange}
          labels={tagPickerLabels}
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={pending || !isFenValid || moves.length === 0 || title.trim() === ''}
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
          handleClearBoard();
        }}
        onCancel={() => setClearBoardOpen(false)}
      />
    </>
  );
}
