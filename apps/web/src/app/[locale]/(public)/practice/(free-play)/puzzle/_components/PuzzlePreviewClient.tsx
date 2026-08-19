'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

import type { ChunkOption } from '@/lib/chunks/types';
import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';
import { buildCoinToastParams } from '@/lib/points/coin-toast-params';
import type { ThemeOption } from '@/lib/themes/types';

import {
  DraftPreviewLayout,
  DraftPreviewSkeleton,
} from '@/app/[locale]/(public)/practice/(free-play)/_components/DraftPreviewLayout';
import { useDraftPreview } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-draft-preview';

import { resolveOptionsByIds } from '../../_lib/resolve-options';
import { createPuzzle } from '../_actions/createPuzzle';
import { clearDraft, readDraft } from '../_lib/draft-storage';
import type { PuzzleDraftV1 } from '../_lib/draft-storage';
import { draftToSolutionMoves } from '../_lib/draft-to-solution-moves';
import { PuzzleSolutionReplay } from './PuzzleSolutionReplay';
import { PuzzleStepIndicator } from './PuzzleStepIndicator';

type Props = {
  /** Tag catalog used to resolve the draft's persisted theme/chunk IDs into
   * display labels for the read-only preview tag list. */
  availableThemes: ThemeOption[];
  availableChunks: ChunkOption[];
};

export function PuzzlePreviewClient({ availableThemes, availableChunks }: Props) {
  const t = useTranslations('practice.puzzle.preview');

  const { draft, hydrated, pending, error, isBlocking, confirm, cancel, submit, leave } =
    useDraftPreview<PuzzleDraftV1>({
      readDraft,
      fallbackPath: '/practice/puzzle/new',
      submitErrorMessage: t('createError'),
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

  const stepIndicator = <PuzzleStepIndicator flow="create" current="preview" />;

  if (!hydrated || !draft) {
    return <DraftPreviewSkeleton stepIndicator={stepIndicator} />;
  }

  const handleCreate = () =>
    submit(async () => {
      const result = await createPuzzle({
        fen: draft.fen,
        title: draft.title,
        description: draft.description || null,
        solutionMoves,
        themeIds: draft.themeIds,
        chunkIds: draft.chunkIds,
        forkedFromId: draft.forkedFromId ?? null,
      });
      if ('error' in result) return { error: result.error };

      clearDraft();

      // Land straight on the created puzzle so the author can verify it.
      const toastParams = buildCoinToastParams(result, 'position_created');
      return { path: `/practice/puzzle/${result.id}?${toastParams.toString()}` };
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
      submitLabel={t('createCta')}
      onSubmit={handleCreate}
      backLabel={t('backToEditCta')}
      // Draft stays in sessionStorage so `/new/solution` can rehydrate it —
      // that's the immediately-prior step in the position → solution →
      // preview flow.
      onBack={() => leave('/practice/puzzle/new/solution')}
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
