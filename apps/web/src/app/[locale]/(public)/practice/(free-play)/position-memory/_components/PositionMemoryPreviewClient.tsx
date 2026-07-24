'use client';

import { useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import { flushSync } from 'react-dom';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { stashGrantedRanks } from '@/app/[locale]/(public)/practice/_lib/granted-ranks-stash';
import { SectionTitle } from '@/app/[locale]/_components';

import { resolveOptionsByIds } from '../../_lib/resolve-options';
import { PuzzlePreviewTags } from '../../puzzle/_components/PuzzlePreviewTags';
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
  const tUnsaved = useTranslations('unsavedChanges');
  const router = useRouter();

  const [draft, setDraft] = useState<PositionMemoryDraftV1 | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // `submitted` flips true in the intentional router.push after a successful
  // create (and on "Back to edit"), letting the `isDirty` guard relax before
  // the navigation fires so we don't trip UnsavedChangesDialog on our own push.
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const d = readDraft();
    if (!d) {
      router.replace('/practice/position-memory/new');
      return;
    }
    setDraft(d);
    setHydrated(true);
  }, [router]);

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

  async function handleCreate() {
    if (!draft) return;
    setPending(true);
    setError(null);
    try {
      const result = await createPosition({
        fen: draft.fen,
        title: draft.title,
        description: draft.description || null,
        themeIds: draft.themeIds,
        chunkIds: draft.chunkIds,
        forkedFromId: draft.forkedFromId ?? null,
      });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      // Stash any belt-rank grants triggered by this submission so the
      // RankAchievementModal on the destination page can pick them up.
      stashGrantedRanks(result.grantedRanks);
      clearDraft();
      flushSync(() => setSubmitted(true));
      // Land straight on the created position so the author can verify it.
      // A point grant surfaces the coin reward as a toast on arrival
      // (`?coinsEarned=N`); no-grant flows keep the plain "created" toast; a
      // daily-cap hit adds a `?coinsCapped=1` warning toast either way.
      const toastParams = new URLSearchParams();
      if (result.pointGrant) {
        toastParams.set('coinsEarned', String(result.pointGrant.amount));
      } else {
        toastParams.set('toast', 'position_created');
      }
      if (result.coinCapped) toastParams.set('coinsCapped', '1');
      router.push(`/practice/position-memory/${result.id}?${toastParams.toString()}`);
    } catch {
      setError(t('createError'));
    } finally {
      setPending(false);
    }
  }

  function handleBackToEdit() {
    // Draft stays in sessionStorage so `/new` silently rehydrates the form.
    // Flip `submitted` so the isDirty guard doesn't intercept our own push.
    flushSync(() => setSubmitted(true));
    router.push('/practice/position-memory/new');
  }

  const stepIndicator = <PositionMemoryStepIndicator current="preview" />;

  if (!hydrated || !draft) {
    // Skeleton during SSR and the brief window before hydration reads
    // sessionStorage. SSR always returns `null` (readDraft's window guard), so
    // a lazy initial state would produce a hydration mismatch.
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

        <PositionDetailBoard fen={draft.fen} flipped={isBlackToMoveFromFen(draft.fen)} />

        <PuzzlePreviewTags themes={selectedThemes} chunks={selectedChunks} />

        {error && (
          <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            disabled={pending}
            loading={pending}
            onClick={handleCreate}
          >
            {t('createCta')}
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
