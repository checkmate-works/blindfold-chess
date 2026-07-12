'use client';

import { useEffect, useMemo, useState } from 'react';

import { useLocale, useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';

import { SectionTitle } from '@/app/[locale]/_components';

import { createPuzzle } from '../_actions/createPuzzle';
import { clearDraft, readDraft } from '../_lib/draft-storage';
import type { PuzzleDraftV1 } from '../_lib/draft-storage';
import { PuzzleSolutionReplay } from './PuzzleSolutionReplay';

function draftToSolutionMoves(draft: PuzzleDraftV1): PuzzleSolutionMove[] {
  return draft.moves.map((san, i) => {
    const raw = draft.notes[i];
    const note = raw && raw.trim().length > 0 ? raw.trim() : null;
    return { san, note };
  });
}

export function PuzzlePreviewClient() {
  const t = useTranslations('practice.puzzle.preview');
  const tUnsaved = useTranslations('unsavedChanges');
  const router = useRouter();
  const locale = useLocale();

  const [draft, setDraft] = useState<PuzzleDraftV1 | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // `submitted` flips true in the intentional router.push after a successful
  // create, letting the `isDirty` guard relax before the navigation fires so
  // we don't trip UnsavedChangesDialog on our own push.
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const d = readDraft();
    if (!d) {
      router.replace('/practice/puzzle/new');
      return;
    }
    setDraft(d);
    setHydrated(true);
  }, [router]);

  const solutionMoves = useMemo<PuzzleSolutionMove[]>(
    () => (draft ? draftToSolutionMoves(draft) : []),
    [draft]
  );

  // Treat the draft as unsaved work for as long as we haven't submitted it;
  // both "Back to edit" (router.push) and "Create" (after success + clearDraft)
  // set `submitted` before navigating so the guard doesn't fire on our own
  // intentional pushes.
  const isDirty = hydrated && !submitted;
  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  async function handleCreate() {
    if (!draft) return;
    setPending(true);
    setError(null);
    try {
      const result = await createPuzzle({
        fen: draft.fen,
        title: draft.title,
        description: draft.description || null,
        solutionMoves,
        themeIds: draft.themeIds,
        chunkIds: draft.chunkIds,
        forkedFromId: draft.forkedFromId ?? null,
      });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      clearDraft();
      flushSync(() => setSubmitted(true));
      // Point grant fired → route via /thanks so the user lands on the
      // award screen, then continues to the puzzle detail (toast suppressed
      // because the /thanks page already celebrates the create). No-grant
      // flows keep the legacy in-place toast UX.
      if (result.pointGrant) {
        const returnUrl = `/${locale}/practice/puzzle/${result.id}`;
        router.push(
          `/thanks?pointEventId=${result.pointGrant.pointEventId}&returnUrl=${encodeURIComponent(returnUrl)}`
        );
      } else {
        router.push(`/practice/puzzle/${result.id}?toast=position_created`);
      }
    } catch {
      setError(t('createError'));
    } finally {
      setPending(false);
    }
  }

  function handleBackToEdit() {
    // Draft stays in sessionStorage so `/new/solution` can rehydrate it —
    // that's the immediately-prior step in the position → solution →
    // preview flow. Flip `submitted` so the isDirty guard doesn't intercept
    // our own navigation.
    flushSync(() => setSubmitted(true));
    router.push('/practice/puzzle/new/solution');
  }

  if (!hydrated || !draft) {
    // Show a skeleton during SSR and the brief window before hydration reads
    // sessionStorage. A lazy `useState(() => readDraft())` would remove this
    // window entirely, but it produces a hydration mismatch: SSR always
    // returns `null` (readDraft's `typeof window === 'undefined'` guard),
    // while the first client render would return the decoded draft, and
    // React's initial state is required to match across SSR / hydration.
    return <div className="h-32 animate-pulse rounded bg-muted/30" />;
  }

  return (
    <>
      <div className="space-y-6">
        <SectionTitle>{draft.title}</SectionTitle>

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
