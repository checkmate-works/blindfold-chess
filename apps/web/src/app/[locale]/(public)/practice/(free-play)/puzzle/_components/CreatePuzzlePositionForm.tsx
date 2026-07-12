'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';
import { FiInfo } from 'react-icons/fi';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { useFenBoardEditor } from '../../_hooks/use-fen-board-editor';
import { useTagSelection } from '../../_hooks/use-tag-selection';
import { EMPTY_BOARD_FEN } from '../../_lib/board-editor-constants';
import { buildDefaultPracticeTitle } from '../../_lib/default-title';
import { usePuzzleDraftHydration } from '../_hooks/use-puzzle-draft-hydration';
import { clearDraft, writeDraft } from '../_lib/draft-storage';
import type { PuzzleDraftV1 } from '../_lib/draft-storage';
import { validatePuzzlePosition } from '../_lib/validate-puzzle-form';
import { PuzzlePositionFields } from './PuzzlePositionFields';

/**
 * Seed payload when the form is opened via `?from=<id>` on the new page.
 * The author's display name is intentionally ignored when this is present:
 * forks copy the source's title verbatim (GitHub-style — repo name carries
 * over) and the user can edit before submitting. `themeIds` / `chunkIds`
 * are resolved against `availableThemes` / `availableChunks` the same way
 * draft hydration does.
 */
export type PuzzleForkSeed = {
  sourceId: string;
  sourceTitle: string;
  fen: string;
  title: string;
  description: string;
  moves: string[];
  notes: string[];
  themeIds: string[];
  chunkIds: string[];
};

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
   */
  availableThemes?: ThemeOption[];
  availableChunks?: ChunkOption[];
  /**
   * Fork-source data when the form is opened via `?from=<id>`. When
   * present, every field is seeded from the source row, the default-title
   * generator is bypassed, and draft hydration is skipped (an unrelated
   * leftover draft would silently overwrite the fork's initial state
   * otherwise). `sourceId` rides through `writeDraft` as `forkedFromId`
   * and is re-validated server-side at create time.
   */
  forkSeed?: PuzzleForkSeed;
  /**
   * Seed the board position when opened via `?fen=` (e.g. "create a puzzle
   * from this game position"). Validated server-side. `forkSeed` wins if
   * both are present; like a fork, an injected seed skips draft hydration.
   */
  injectedFen?: string;
  /**
   * Optional draft solution (SAN moves) to accompany `injectedFen` — e.g.
   * the game's actual continuation seeded as the first solution move. Each
   * move is already validated legal from `injectedFen` server-side.
   */
  injectedSolution?: string[];
};

export function CreatePuzzlePositionForm({
  displayName,
  disableUnsavedGuard = false,
  availableThemes = [],
  availableChunks = [],
  forkSeed,
  injectedFen,
  injectedSolution,
}: Props = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('practice.puzzle.create');
  const tUnsaved = useTranslations('unsavedChanges');

  // Set by the solution step's Back button (`?resumed=1`) to distinguish
  // "the user just navigated back within this authoring session" from a
  // genuine cold `/new` hit with a leftover draft — only the latter should
  // show the "Continuing from a previous draft" banner. Stripped from the
  // URL right after read so it doesn't linger or get bookmarked.
  const resumed = searchParams.get('resumed') === '1';
  useEffect(() => {
    if (resumed) {
      router.replace('/practice/puzzle/new');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumed]);

  // When forking, the source's title carries over verbatim; otherwise the
  // date-based default is used. defaultTitleRef anchors the dirty-check
  // baseline so a forked title is "clean" until the user edits it.
  const defaultTitleRef = useRef(
    forkSeed ? forkSeed.title : buildDefaultPracticeTitle('Puzzle', displayName)
  );
  const [title, setTitle] = useState(defaultTitleRef.current);
  const [description, setDescription] = useState(forkSeed?.description ?? '');
  // forkedFromId lives in React state (not just the prop) so the lineage
  // survives a `/new?from=X` → solution → preview → "Back to edit" round
  // trip: later visits to `/new` arrive WITHOUT `?from=`, so `forkSeed` is
  // undefined and only the draft remembers the source.
  const [forkedFromId, setForkedFromId] = useState<string | undefined>(forkSeed?.sourceId);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startOverOpen, setStartOverOpen] = useState(false);
  const [positionChangedOpen, setPositionChangedOpen] = useState(false);

  // Resolve fork seed tag IDs into option objects using the loaded catalog,
  // mirroring the draft-hydration resolution.
  const seededThemes = useRef<ThemeOption[]>(
    forkSeed
      ? forkSeed.themeIds
          .map((id) => availableThemes.find((t) => t.id === id))
          .filter((t): t is ThemeOption => t !== undefined)
      : []
  ).current;
  const seededChunks = useRef<ChunkOption[]>(
    forkSeed
      ? forkSeed.chunkIds
          .map((id) => availableChunks.find((c) => c.id === id))
          .filter((c): c is ChunkOption => c !== undefined)
      : []
  ).current;

  const board = useFenBoardEditor({ initialFen: forkSeed?.fen ?? injectedFen });
  const tags = useTagSelection({ initialThemes: seededThemes, initialChunks: seededChunks });

  // Solution moves are never edited on this step — they're only carried
  // through untouched to the solution step, plus used to detect whether the
  // position changed under them (see handleContinue below).
  const injectedNotes = injectedSolution?.map(() => '');
  const [carriedMoves, setCarriedMoves] = useState<string[]>(
    forkSeed?.moves ?? injectedSolution ?? []
  );
  const [carriedNotes, setCarriedNotes] = useState<string[]>(
    forkSeed?.notes ?? injectedNotes ?? []
  );
  // The FEN `carriedMoves` are valid against. Reassigned inside the
  // hydration `apply` callback (not just at declaration) so a restored
  // draft's fen/moves pair is never compared against a stale value.
  const originalFenRef = useRef(forkSeed?.fen ?? injectedFen ?? '');

  // Resolve draft IDs against the loaded catalog so the picker has full
  // option objects (label + slug + category) to render. IDs not present in
  // the catalog (e.g. a chunk soft-deleted between draft write and
  // hydration) silently drop. Skipped entirely when forking/injecting — the
  // seed owns initial state and an unrelated leftover draft would silently
  // overwrite it.
  const { hydratedFromDraft, resetHydrated } = usePuzzleDraftHydration<PuzzleDraftV1>({
    enabled: !forkSeed && !injectedFen,
    apply: (draft) => {
      board.setFenInput(draft.fen);
      board.setBoardFen(draft.fen);
      board.setSideToMove(draft.sideToMove);
      board.setActiveTab(draft.activeTab);
      board.setFlipped(draft.flipped);
      board.setUserFlipped(draft.userFlipped);
      setTitle(draft.title);
      setDescription(draft.description);
      setCarriedMoves(draft.moves);
      setCarriedNotes(draft.notes);
      originalFenRef.current = draft.fen;
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
      // Restore the fork lineage that writeDraft persisted on a previous
      // /new visit — otherwise a "Back to edit" round-trip would silently
      // drop forkedFromId on the next write.
      if (draft.forkedFromId) {
        setForkedFromId(draft.forkedFromId);
      }
    },
  });

  const isDirty =
    !submitted &&
    (title.trim() !== defaultTitleRef.current.trim() ||
      description.trim() !== '' ||
      carriedMoves.length > 0 ||
      carriedNotes.some((n) => n.trim() !== '') ||
      (board.fenInput.trim() !== '' && board.fenInput !== EMPTY_BOARD_FEN) ||
      tags.selectedThemes.length > 0 ||
      tags.selectedChunks.length > 0);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({
    isDirty: disableUnsavedGuard ? false : isDirty,
  });

  function writeAndContinue(moves: string[], notes: string[]) {
    // Persist authoring state to sessionStorage and hand off to the
    // solution step. If the draft write fails (quota / private mode), stay
    // on the form and surface an error — navigating to a step that would
    // immediately bounce back is worse UX.
    const ok = writeDraft({
      version: 1,
      fen: board.trimmedFen,
      title,
      description,
      moves,
      notes,
      activeTab: board.activeTab,
      sideToMove: board.sideToMove,
      flipped: board.flipped,
      userFlipped: board.userFlipped,
      themeIds: tags.selectedThemes.map((t) => t.id),
      chunkIds: tags.selectedChunks.map((c) => c.id),
      ...(forkedFromId ? { forkedFromId } : {}),
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
    router.push('/practice/puzzle/new/solution');
  }

  function handleContinue() {
    setError(null);
    if (!validatePuzzlePosition(board)) return;

    setPending(true);

    const positionChanged = carriedMoves.length > 0 && board.trimmedFen !== originalFenRef.current;
    if (positionChanged) {
      setPositionChangedOpen(true);
      setPending(false);
      return;
    }

    writeAndContinue(carriedMoves, carriedNotes);
  }

  function handleConfirmPositionChanged() {
    setPositionChangedOpen(false);
    setPending(true);
    setCarriedMoves([]);
    setCarriedNotes([]);
    originalFenRef.current = board.trimmedFen;
    writeAndContinue([], []);
  }

  function handleStartOver() {
    clearDraft();
    board.resetBoard();
    tags.reset();
    setCarriedMoves(forkSeed?.moves ?? injectedSolution ?? []);
    setCarriedNotes(forkSeed?.notes ?? injectedNotes ?? []);
    originalFenRef.current = forkSeed?.fen ?? injectedFen ?? '';
    setTitle(defaultTitleRef.current);
    setDescription('');
    // Start-over also clears the fork lineage held in component state —
    // otherwise the next write would still pin to the old parent even
    // though the user has explicitly asked for a clean slate.
    setForkedFromId(undefined);
    setError(null);
    resetHydrated();
    setStartOverOpen(false);
  }

  return (
    <>
      <div className="space-y-6">
        {error && (
          <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
            {error}
          </div>
        )}

        {hydratedFromDraft && !resumed && (
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

        {forkSeed && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground"
          >
            <FiInfo className="h-4 w-4 flex-shrink-0" aria-hidden />
            <span>{t('forkBanner', { sourceTitle: forkSeed.sourceTitle })}</span>
          </div>
        )}

        <PuzzlePositionFields
          board={board}
          tags={tags}
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          pending={pending}
          availableThemes={availableThemes}
          availableChunks={availableChunks}
          onContinue={handleContinue}
          continueLabel={t('continueToSolution')}
        />
      </div>

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
        isOpen={positionChangedOpen}
        title={t('positionChangedConfirmTitle')}
        message={t('positionChangedConfirmMessage')}
        confirmText={t('positionChangedConfirmConfirm')}
        cancelText={t('positionChangedConfirmCancel')}
        confirmVariant="danger"
        onConfirm={handleConfirmPositionChanged}
        onCancel={() => setPositionChangedOpen(false)}
      />
    </>
  );
}
