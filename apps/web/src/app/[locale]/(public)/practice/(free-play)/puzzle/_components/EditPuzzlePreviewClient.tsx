'use client';

import { useCallback, useMemo } from 'react';

import { useTranslations } from 'next-intl';

import type { ChunkOption } from '@/lib/chunks/types';
import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';
import type { ThemeOption } from '@/lib/themes/types';

import {
  DraftPreviewLayout,
  DraftPreviewSkeleton,
} from '@/app/[locale]/(public)/practice/(free-play)/_components/DraftPreviewLayout';
import { useDraftPreview } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-draft-preview';

import { resolveOptionsByIds } from '../../_lib/resolve-options';
import { updatePuzzle } from '../_actions/updatePuzzle';
import { draftToSolutionMoves } from '../_lib/draft-to-solution-moves';
import type { PuzzleEditDraftV1 } from '../_lib/edit-draft-storage';
import { clearEditDraft, readEditDraft } from '../_lib/edit-draft-storage';
import { PuzzleSolutionReplay } from './PuzzleSolutionReplay';
import { PuzzleStepIndicator } from './PuzzleStepIndicator';

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

  const readDraft = useCallback(() => readEditDraft(positionId), [positionId]);

  const { draft, hydrated, pending, error, isBlocking, confirm, cancel, submit, leave } =
    useDraftPreview<PuzzleEditDraftV1>({
      readDraft,
      fallbackPath: `/practice/puzzle/${positionId}/edit`,
      submitErrorMessage: tEdit('saveError'),
    });

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

  const stepIndicator = <PuzzleStepIndicator flow="edit" current="preview" />;

  if (!hydrated || !draft) {
    return <DraftPreviewSkeleton stepIndicator={stepIndicator} />;
  }

  const handleSave = () =>
    submit(async () => {
      const result = await updatePuzzle({
        id: positionId,
        fen: draft.fen,
        title: draft.title,
        description: draft.description || null,
        solutionMoves,
        themeIds: draft.themeIds,
        chunkIds: draft.chunkIds,
      });
      if ('error' in result) return { error: result.error };

      clearEditDraft(positionId);
      return { path: `/practice/puzzle/${positionId}?toast=puzzle_updated` };
    });

  return (
    <DraftPreviewLayout
      stepIndicator={stepIndicator}
      title={draft.title}
      description={draft.description}
      themes={selectedThemes}
      chunks={selectedChunks}
      error={error}
      pending={pending}
      submitLabel={pending ? tEdit('submitting') : tEdit('submit')}
      onSubmit={handleSave}
      backLabel={t('backToEditCta')}
      // Draft stays in sessionStorage so the solution step can rehydrate it.
      onBack={() => leave(`/practice/puzzle/${positionId}/edit/solution`)}
      guard={{ isBlocking, confirm, cancel }}
    >
      <p className="text-sm text-muted-foreground">
        {t('moveCount', { count: draft.moves.length })}
      </p>

      <PuzzleSolutionReplay
        fen={draft.fen}
        solutionMoves={solutionMoves}
        showSectionTitle={false}
      />
    </DraftPreviewLayout>
  );
}
