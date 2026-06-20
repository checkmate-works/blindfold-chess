'use client';

import { useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';
import { FiInfo } from 'react-icons/fi';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { EMPTY_BOARD_FEN } from '../../_lib/board-editor-constants';
import { buildDefaultPracticeTitle } from '../../_lib/default-title';
import { usePuzzleDraftHydration } from '../_hooks/use-puzzle-draft-hydration';
import { usePuzzleFormComposition } from '../_hooks/use-puzzle-form-composition';
import { clearDraft, writeDraft } from '../_lib/draft-storage';
import { validatePuzzleForm } from '../_lib/validate-puzzle-form';
import { PuzzleFormFields } from './PuzzleFormFields';

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
   * Optional with empty defaults so the form stays renderable in tests
   * and on routes that don't supply this data (e.g. the legacy guest
   * gate path before sign-in completes).
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

export function CreatePuzzleForm({
  displayName,
  disableUnsavedGuard = false,
  availableThemes = [],
  availableChunks = [],
  forkSeed,
  injectedFen,
  injectedSolution,
}: Props = {}) {
  const router = useRouter();
  const t = useTranslations('practice.puzzle.create');
  const tUnsaved = useTranslations('unsavedChanges');

  // When forking, the source's title carries over verbatim; otherwise the
  // date-based default is used. defaultTitleRef anchors the dirty-check
  // baseline so a forked title is "clean" until the user edits it.
  const defaultTitleRef = useRef(
    forkSeed ? forkSeed.title : buildDefaultPracticeTitle('Puzzle', displayName)
  );
  const [title, setTitle] = useState(defaultTitleRef.current);
  const [description, setDescription] = useState(forkSeed?.description ?? '');
  // forkedFromId lives in React state (not just the prop) so the lineage
  // survives a `/new?from=X` → preview → "Back to edit" round-trip: that
  // second `/new` arrives WITHOUT the `?from=` query, so `forkSeed` is
  // undefined and only the draft remembers the source. Draft hydration
  // restores this state below, and writeDraft reads it on submit.
  const [forkedFromId, setForkedFromId] = useState<string | undefined>(forkSeed?.sourceId);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startOverOpen, setStartOverOpen] = useState(false);

  // Resolve fork seed tag IDs into option objects using the loaded catalog,
  // mirroring the draft-hydration resolution. Computed once via lazy useRef
  // initializer so it survives subsequent renders without re-running the
  // .find() lookups.
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

  // A fork seeds every field; an injected `?fen=` (optionally with a draft
  // continuation solution) seeds only the position + moves. Notes default to
  // blanks parallel to the seeded moves.
  const injectedNotes = injectedSolution?.map(() => '');
  const { board, solution, tags } = usePuzzleFormComposition({
    initialFen: forkSeed?.fen ?? injectedFen,
    initialMoves: forkSeed?.moves ?? injectedSolution,
    initialNotes: forkSeed?.notes ?? injectedNotes,
    initialThemes: seededThemes,
    initialChunks: seededChunks,
  });

  // Resolve draft IDs against the loaded catalog so the picker has full
  // option objects (label + slug + category) to render. IDs not present
  // in the catalog (e.g. a chunk soft-deleted between draft write and
  // hydration) silently drop, since attaching them would fail validation
  // anyway and we'd rather hydrate cleanly than block the author.
  // Skipped entirely when forking — the fork seed owns initial state and
  // an unrelated leftover draft would silently overwrite it.
  const { hydratedFromDraft, resetHydrated } = usePuzzleDraftHydration({
    enabled: !forkSeed && !injectedFen,
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
      // Restore the fork lineage that writeDraft persisted on the previous
      // /new visit. Without this, the "Back to edit" round-trip (which
      // pushes to `/practice/puzzle/new` without preserving `?from=<id>`)
      // would silently drop forkedFromId on the next submit.
      if (draft.forkedFromId) {
        setForkedFromId(draft.forkedFromId);
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

    if (!validatePuzzleForm(board, solution, t('solutionRequired'))) {
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
    router.push('/practice/puzzle/new/preview');
  }

  function handleStartOver() {
    clearDraft();
    board.resetBoard();
    solution.reset();
    tags.reset();
    setTitle(defaultTitleRef.current);
    setDescription('');
    // Start-over also clears the fork lineage held in component state —
    // otherwise the next submit would still pin to the old parent even
    // though the user has explicitly asked for a clean slate.
    setForkedFromId(undefined);
    setError(null);
    resetHydrated();
    setStartOverOpen(false);
  }

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

        <PuzzleFormFields
          board={board}
          solution={solution}
          tags={tags}
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          pending={pending}
          availableThemes={availableThemes}
          availableChunks={availableChunks}
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
    </>
  );
}
