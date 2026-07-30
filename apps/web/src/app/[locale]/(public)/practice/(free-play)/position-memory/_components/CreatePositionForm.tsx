'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useSubmitError } from '@/_hooks/useSubmitError';
import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, FormErrorBanner, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import { flushSync } from 'react-dom';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { useFenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';
import { useTagSelection } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-tag-selection';
import { buildDefaultPracticeTitle } from '@/app/[locale]/(public)/practice/(free-play)/_lib/default-title';
import {
  normalizeBaselineFen,
  toSortedIdKey,
} from '@/app/[locale]/(public)/practice/(free-play)/_lib/dirty-baseline';
import { resolveOptionsByIds } from '@/app/[locale]/(public)/practice/(free-play)/_lib/resolve-options';

import { readDraft, writeDraft } from '../_lib/draft-storage';
import { type PositionFormField, validatePositionForm } from '../_lib/position-form-validation';
import { PositionFormFields } from './PositionFormFields';
import { PositionMemoryStepIndicator } from './PositionMemoryStepIndicator';

/**
 * Seed payload when the form is opened via `?from=<id>` on the new page.
 * The author's display name is intentionally ignored when this is present:
 * forks copy the source's title verbatim (GitHub-style — repo name carries
 * over). `themeIds` / `chunkIds` are resolved against the loaded catalogs.
 */
export type PositionForkSeed = {
  sourceId: string;
  sourceTitle: string;
  fen: string;
  title: string;
  description: string;
  themeIds: string[];
  chunkIds: string[];
};

type Props = {
  displayName?: string;
  /**
   * Skip the unsaved-changes navigation guard. Used when the form is
   * rendered behind a guest sign-up overlay: the guest cannot submit, so
   * the guard would otherwise block the sign-up CTA click with a modal
   * that makes no sense in context.
   */
  disableUnsavedGuard?: boolean;
  availableThemes?: ThemeOption[];
  availableChunks?: ChunkOption[];
  /**
   * Fork-source data when the form is opened via `?from=<id>`. When
   * present, every field is seeded from the source row and the default
   * title generator is bypassed. `sourceId` rides through to the preview's
   * `createPosition` call as `forkedFromId` and is re-validated server-side.
   * Draft hydration is skipped so an unrelated leftover draft never silently
   * overwrites the fork's initial state.
   */
  forkSeed?: PositionForkSeed;
  /**
   * Seed only the board position (e.g. "add this game position to memory",
   * passed via `?fen=`). Validated server-side. Unlike a fork it carries no
   * title/tags and shows no provenance line; `forkSeed` wins if both are
   * present.
   */
  injectedFen?: string;
  /**
   * Seed the chunk tag picker (e.g. "add a position for this chunk", passed
   * via `?chunk=<slug-or-id>` and resolved server-side). Merged with any
   * fork-seeded chunks rather than overridden by them.
   */
  injectedChunkIds?: string[];
};

export function CreatePositionForm({
  displayName,
  disableUnsavedGuard = false,
  availableThemes = [],
  availableChunks = [],
  forkSeed,
  injectedFen,
  injectedChunkIds,
}: Props = {}) {
  const router = useRouter();
  const t = useTranslations('practice.positionMemory.create');
  const tUnsaved = useTranslations('unsavedChanges');

  // Resolve fork seed tag IDs into option objects using the loaded catalog.
  // Computed once via useRef so option lookups don't repeat each render.
  const seededThemes = useRef<ThemeOption[]>(
    forkSeed ? resolveOptionsByIds(forkSeed.themeIds, availableThemes) : []
  ).current;
  const seededChunks = useRef<ChunkOption[]>(
    resolveOptionsByIds(
      [...(forkSeed?.chunkIds ?? []), ...(injectedChunkIds ?? [])],
      availableChunks
    )
  ).current;

  // A fork seeds the whole row; an injected `?fen=` seeds only the position.
  const seededFen = forkSeed?.fen ?? injectedFen;
  const board = useFenBoardEditor({ initialFen: seededFen });
  const tags = useTagSelection({
    initialThemes: seededThemes,
    initialChunks: seededChunks,
  });

  // Baselines for the dirty-check, captured once on mount. The form starts
  // pre-populated — a default title is always present, and fork mode seeds
  // every field — so the guard must compare against these initial values
  // rather than against "empty". Without this, an untouched `/new` visit is
  // immediately `isDirty: true` (the auto-generated title is non-empty) and
  // the unsaved-changes guard prompts on the first navigation away.
  const defaultTitleRef = useRef(
    forkSeed ? forkSeed.title : buildDefaultPracticeTitle('Position', displayName)
  );
  const defaultDescriptionRef = useRef(forkSeed?.description ?? '');
  const initialThemeIdsRef = useRef(toSortedIdKey(seededThemes));
  const initialChunkIdsRef = useRef(toSortedIdKey(seededChunks));

  const [title, setTitle] = useState(defaultTitleRef.current);
  const [description, setDescription] = useState(defaultDescriptionRef.current);
  // forkedFromId lives in React state (not just the prop) so the lineage
  // survives a `/new?from=X` → preview → "Back to edit" round trip: later
  // visits to `/new` arrive WITHOUT `?from=`, so `forkSeed` is undefined and
  // only the draft remembers the source.
  const [forkedFromId, setForkedFromId] = useState<string | undefined>(forkSeed?.sourceId);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // A rejected position has no text control to focus while the board tab
  // is showing, so it anchors on the position block instead.
  const submitError = useSubmitError<PositionFormField>((field) =>
    field === 'title' ? 'title' : board.activeTab === 'board' ? 'position-editor' : 'fen'
  );

  // Once-on-mount draft hydration — silent by design. The draft only exists to
  // carry the form's fields across the `/new → /new/preview` hop, so restoring
  // it on a "Back to edit" return is the expected, unremarkable behavior; no
  // banner is shown. `didHydrate` guards against remounts (e.g. Fast Refresh)
  // clobbering user edits. Skipped when the form is seeded from a
  // fork/injection — the seed owns initial state and an unrelated leftover
  // draft would silently overwrite it. The draft is NOT cleared here — it is
  // cleared only on a successful create (see the preview step).
  const didHydrate = useRef(false);
  useEffect(() => {
    if (forkSeed || injectedFen) return;
    if (didHydrate.current) return;
    didHydrate.current = true;
    const draft = readDraft();
    if (!draft) return;
    board.setFenInput(draft.fen);
    board.setBoardFen(draft.fen);
    board.setSideToMove(isBlackToMoveFromFen(draft.fen) ? 'b' : 'w');
    board.setActiveTab(draft.activeTab);
    board.setFlipped(draft.flipped);
    setTitle(draft.title);
    setDescription(draft.description);
    if (draft.themeIds && draft.themeIds.length > 0) {
      tags.setSelectedThemes(resolveOptionsByIds(draft.themeIds, availableThemes));
    }
    if (draft.chunkIds && draft.chunkIds.length > 0) {
      tags.setSelectedChunks(resolveOptionsByIds(draft.chunkIds, availableChunks));
    }
    if (draft.forkedFromId) {
      setForkedFromId(draft.forkedFromId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty =
    !submitted &&
    (title.trim() !== defaultTitleRef.current.trim() ||
      description.trim() !== defaultDescriptionRef.current.trim() ||
      normalizeBaselineFen(board.fenInput) !== normalizeBaselineFen(seededFen ?? '') ||
      toSortedIdKey(tags.selectedThemes) !== initialThemeIdsRef.current ||
      toSortedIdKey(tags.selectedChunks) !== initialChunkIdsRef.current);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({
    isDirty: disableUnsavedGuard ? false : isDirty,
  });

  function handleContinue() {
    submitError.clear();
    board.setPositionError(false);

    const invalid = validatePositionForm({
      trimmedFen: board.trimmedFen,
      isFenValid: board.isFenValid,
      title,
    });
    if (invalid) {
      submitError.report(invalid.field, t(invalid.key));
      return;
    }

    setPending(true);

    const ok = writeDraft({
      version: 1,
      fen: board.trimmedFen,
      title,
      description,
      activeTab: board.activeTab,
      flipped: board.flipped,
      themeIds: tags.selectedThemes.map((th) => th.id),
      chunkIds: tags.selectedChunks.map((c) => c.id),
      ...(forkedFromId ? { forkedFromId } : {}),
    });
    if (!ok) {
      setPending(false);
      submitError.report(null, t('draftWriteFailed'));
      return;
    }

    // flushSync ensures the re-render (isDirty → false) completes before
    // router.push triggers the navigation guard check — otherwise the
    // intentional push would fire the UnsavedChangesDialog.
    flushSync(() => setSubmitted(true));
    router.push('/practice/position-memory/new/preview');
  }

  return (
    <>
      <div className="space-y-6">
        <PositionMemoryStepIndicator current="position" />

        <FormErrorBanner ref={submitError.summaryRef} message={submitError.formMessage} />

        <PositionFormFields
          board={board}
          tags={tags}
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          pending={pending}
          availableThemes={availableThemes}
          availableChunks={availableChunks}
          messageFor={submitError.messageFor}
        />

        {/*
         * Only `pending` disables this. Blocking the click on an invalid
         * position or an empty title would be silent about which of the
         * two is missing; `handleContinue` says so and moves focus there.
         */}
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          disabled={pending}
          onClick={handleContinue}
        >
          {t('continueToPreview')}
        </Button>
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
    </>
  );
}
