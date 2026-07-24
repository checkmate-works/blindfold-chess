'use client';

import { useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import type { ChunkOption } from '@/lib/chunks/types';
import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';
import type { ThemeOption } from '@/lib/themes/types';

import { SectionTitle } from '@/app/[locale]/_components';

import { resolveOptionsByIds } from '../../_lib/resolve-options';
import { updatePuzzle } from '../_actions/updatePuzzle';
import { draftToSolutionMoves } from '../_lib/draft-to-solution-moves';
import type { PuzzleEditDraftV1 } from '../_lib/edit-draft-storage';
import { clearEditDraft, readEditDraft } from '../_lib/edit-draft-storage';
import { PuzzleFormErrorBanner } from './PuzzleFormErrorBanner';
import { PuzzlePreviewTags } from './PuzzlePreviewTags';
import { PuzzleSolutionReplay } from './PuzzleSolutionReplay';
import { PuzzleStepIndicator } from './PuzzleStepIndicator';
import { PuzzleUnsavedChangesDialog } from './PuzzleUnsavedChangesDialog';

type Props = {
  positionId: string;
  /** Tag catalog used to resolve the draft's persisted theme/chunk IDs into
   * display labels for the read-only preview tag list. */
  availableThemes: ThemeOption[];
  availableChunks: ChunkOption[];
};

/**
 * Final step of the puzzle edit flow — replays the draft one last time before
 * committing it via `updatePuzzle`. Mirrors `PuzzlePreviewClient` (the create
 * flow's preview) but reads the ID-scoped edit draft and saves through the
 * update action instead of the create action. `EditPuzzleSolutionForm`
 * persists the draft before pushing here; a direct URL hit with no draft
 * bounces back to the position step.
 */
export function EditPuzzlePreviewClient({ positionId, availableThemes, availableChunks }: Props) {
  const t = useTranslations('practice.puzzle.preview');
  const tEdit = useTranslations('practice.puzzle.edit');
  const router = useRouter();

  const [draft, setDraft] = useState<PuzzleEditDraftV1 | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Flips true just before our own intentional navigation (Save success or
  // Back), relaxing the unsaved-changes guard so it doesn't fire on our push.
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const d = readEditDraft(positionId);
    if (!d) {
      router.replace(`/practice/puzzle/${positionId}/edit`);
      return;
    }
    setDraft(d);
    setHydrated(true);
  }, [router, positionId]);

  const solutionMoves = useMemo<PuzzleSolutionMove[]>(
    () => (draft ? draftToSolutionMoves(draft) : []),
    [draft]
  );

  const selectedThemes = useMemo(
    () => resolveOptionsByIds(draft?.themeIds ?? [], availableThemes),
    [draft?.themeIds, availableThemes]
  );
  const selectedChunks = useMemo(
    () => resolveOptionsByIds(draft?.chunkIds ?? [], availableChunks),
    [draft?.chunkIds, availableChunks]
  );

  const isDirty = hydrated && !submitted;
  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  async function handleSave() {
    if (!draft) return;
    setPending(true);
    setError(null);
    try {
      const result = await updatePuzzle({
        id: positionId,
        fen: draft.fen,
        title: draft.title,
        description: draft.description || null,
        solutionMoves,
        themeIds: draft.themeIds,
        chunkIds: draft.chunkIds,
      });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      clearEditDraft(positionId);
      flushSync(() => setSubmitted(true));
      router.push(`/practice/puzzle/${positionId}?toast=puzzle_updated`);
    } catch {
      setError(tEdit('saveError'));
    } finally {
      setPending(false);
    }
  }

  function handleBackToEdit() {
    // Draft stays in sessionStorage so the solution step can rehydrate it.
    flushSync(() => setSubmitted(true));
    router.push(`/practice/puzzle/${positionId}/edit/solution`);
  }

  const stepIndicator = <PuzzleStepIndicator flow="edit" current="preview" />;

  if (!hydrated || !draft) {
    // Same SSR/hydration-mismatch rationale as PuzzlePreviewClient: a lazy
    // `useState(() => readEditDraft())` initializer would mismatch since the
    // draft read always returns null during SSR.
    return (
      <div className="space-y-6">
        {stepIndicator}
        <div className="h-32 animate-pulse rounded bg-muted/30" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <SectionTitle>{draft.title}</SectionTitle>

        {stepIndicator}

        {draft.description.trim() !== '' && (
          <p className="text-foreground whitespace-pre-wrap">{draft.description}</p>
        )}

        <p className="text-sm text-muted-foreground">
          {t('moveCount', { count: draft.moves.length })}
        </p>

        <PuzzleSolutionReplay
          fen={draft.fen}
          solutionMoves={solutionMoves}
          showSectionTitle={false}
        />

        <PuzzlePreviewTags themes={selectedThemes} chunks={selectedChunks} />

        <PuzzleFormErrorBanner message={error} />

        <div className="flex flex-col gap-3 pt-2">
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            disabled={pending}
            loading={pending}
            onClick={handleSave}
          >
            {pending ? tEdit('submitting') : tEdit('submit')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            disabled={pending}
            onClick={handleBackToEdit}
          >
            {t('backToEditCta')}
          </Button>
        </div>
      </div>

      <PuzzleUnsavedChangesDialog open={isBlocking} onConfirm={confirm} onCancel={cancel} />
    </>
  );
}
