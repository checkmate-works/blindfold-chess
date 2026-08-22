'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

import { BoardFrame } from '@/app/_components';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import {
  DraftPreviewLayout,
  DraftPreviewSkeleton,
} from '@/app/[locale]/(public)/practice/(free-play)/_components/DraftPreviewLayout';
import { useDraftPreview } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-draft-preview';
import { stashGrantedRanks } from '@/app/[locale]/(public)/practice/_lib/granted-ranks-stash';

import { resolveOptionsByIds } from '../../_lib/resolve-options';
import { createPosition } from '../_actions/createPosition';
import { clearDraft, readDraft } from '../_lib/draft-storage';
import type { PositionMemoryDraftV1 } from '../_lib/draft-storage';
import { PositionMemoryStepIndicator } from './PositionMemoryStepIndicator';
import { PositionDetailBoard } from './single-position/PositionDetailBoard';

type Props = {
  /** Tag catalog used to resolve the draft's persisted theme/chunk IDs into
   * display labels for the read-only preview tag list. */
  availableThemes: ThemeOption[];
  availableChunks: ChunkOption[];
};

/**
 * Read-only preview of a position-memory draft (title, description, board,
 * tags) shown between the authoring form and the publish. Mirrors the puzzle
 * flow's `PuzzlePreviewClient`, minus the solution replay — a position-memory
 * entry has no solution moves, so the board is rendered statically. The board
 * orientation is derived from the FEN's active color, exactly as every
 * downstream surface (detail peek, memorize, recreate) renders it.
 */
export function PositionMemoryPreviewClient({ availableThemes, availableChunks }: Props) {
  const t = useTranslations('practice.positionMemory.preview');

  const { draft, hydrated, pending, error, isBlocking, confirm, cancel, submit, leave } =
    useDraftPreview<PositionMemoryDraftV1>({
      readDraft,
      fallbackPath: '/practice/position-memory/new',
      submitErrorMessage: t('createError'),
    });

  const selectedThemes = useMemo(
    () => resolveOptionsByIds(draft?.themeIds ?? [], availableThemes),
    [draft?.themeIds, availableThemes]
  );
  const selectedChunks = useMemo(
    () => resolveOptionsByIds(draft?.chunkIds ?? [], availableChunks),
    [draft?.chunkIds, availableChunks]
  );

  const stepIndicator = <PositionMemoryStepIndicator current="preview" />;

  if (!hydrated || !draft) {
    return <DraftPreviewSkeleton stepIndicator={stepIndicator} />;
  }

  const handleCreate = () =>
    submit(async () => {
      const result = await createPosition({
        fen: draft.fen,
        title: draft.title,
        description: draft.description || null,
        themeIds: draft.themeIds,
        chunkIds: draft.chunkIds,
        forkedFromId: draft.forkedFromId ?? null,
      });
      if ('error' in result) return { error: result.error };

      // Stash any belt-rank grants triggered by this submission so the
      // RankAchievementModal on the destination page can pick them up.
      stashGrantedRanks(result.grantedRanks);
      clearDraft();

      // Land straight on the created position so the author can verify it.
      return { path: `/practice/position-memory/${result.id}?toast=position_created` };
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
      // Draft stays in sessionStorage so `/new` silently rehydrates the form.
      onBack={() => leave('/practice/position-memory/new')}
      guard={{ isBlocking, confirm, cancel }}
    >
      <BoardFrame>
        <PositionDetailBoard fen={draft.fen} flipped={isBlackToMoveFromFen(draft.fen)} />
      </BoardFrame>
    </DraftPreviewLayout>
  );
}
