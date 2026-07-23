'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { BoardFrame, Button, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';

import { SectionTitle } from '@/app/[locale]/_components';

import { createChunk } from '../_actions/createChunk';
import { type ChunkDraftV1, clearChunkDraft, readChunkDraft } from '../_lib/draft-storage';
import { localizeChunkError } from '../_lib/localize-error';

const PREVIEW_ERROR_CODES = new Set([
  'signInRequired',
  'banned',
  'rateLimited',
  'slugTaken',
  'notFound',
  'unauthorized',
  'alreadyDeleted',
  'invalidFeedbackTopic',
  'descriptionRequired',
]);

/**
 * Read the chunk draft and present it for confirmation before calling
 * `createChunk`. Mirrors `PuzzlePreviewClient` step-for-step:
 *
 * 1. On mount, read the draft. If absent (deep link or stale tab),
 *    bounce back to `/chunks/new`.
 * 2. Render the title, description, board (with annotations), and
 *    slug for the author to verify.
 * 3. "Create" → `createChunk`; on success clear the draft and navigate
 *    straight to `/chunks/<slug>`, appending `?coinsEarned=N` to surface
 *    the coin-reward toast when a point grant fired.
 * 4. "Back to edit" → keep the draft, navigate to `/chunks/new`. The
 *    form rehydrates from sessionStorage so the author lands back on
 *    their state without re-entering anything.
 */
export function ChunkPreviewClient() {
  const t = useTranslations('chunks.preview');
  const tForm = useTranslations('chunks.form');
  const tUnsaved = useTranslations('unsavedChanges');
  const router = useRouter();

  const [draft, setDraft] = useState<ChunkDraftV1 | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Flips true on intentional pushes (create-success or back-to-edit) so
  // the dirty guard doesn't intercept our own navigation.
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const d = readChunkDraft();
    if (!d) {
      router.replace('/chunks/new');
      return;
    }
    setDraft(d);
    setHydrated(true);
  }, [router]);

  const isDirty = hydrated && !submitted;
  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  async function handleCreate() {
    if (!draft) return;
    setPending(true);
    setError(null);
    try {
      const result = await createChunk({
        representativeFen: draft.representativeFen,
        title: draft.title,
        slug: draft.slug,
        description: draft.description || null,
        annotations: draft.annotations,
        status: draft.status,
        // Topics are only persisted when status === 'draft' (see
        // `createChunkEntry`), but forwarding them unconditionally
        // keeps this call site agnostic of that rule and means a user
        // who flips back from "publish" to "draft" on the form before
        // submitting the preview retains their ticks without a
        // surprise round-trip clear.
        feedbackTopics: draft.feedbackTopics,
      });
      if ('error' in result) {
        setError(localizeChunkError(result.error, tForm, PREVIEW_ERROR_CODES));
        return;
      }
      clearChunkDraft();
      flushSync(() => setSubmitted(true));

      // Land straight on the created chunk so the author can verify it.
      // A point grant surfaces the coin reward as a toast on arrival
      // (`?coinsEarned=N`) and a daily-cap hit adds a `?coinsCapped=1` warning;
      // an uncapped no-grant create navigates silently as before.
      const toastParams = new URLSearchParams();
      if (result.pointGrant) toastParams.set('coinsEarned', String(result.pointGrant.amount));
      if (result.coinCapped) toastParams.set('coinsCapped', '1');
      const toastQs = toastParams.toString();
      router.push(`/chunks/${result.slug}${toastQs ? `?${toastQs}` : ''}` as '/chunks/[slug]');
    } catch {
      setError(t('createError'));
    } finally {
      setPending(false);
    }
  }

  function handleBackToEdit() {
    // Draft stays in sessionStorage so /new rehydrates. Flip `submitted`
    // so isDirty drops before our intentional push.
    flushSync(() => setSubmitted(true));
    router.push('/chunks/new');
  }

  if (!hydrated || !draft) {
    return <div className="h-32 animate-pulse rounded bg-muted/30" />;
  }

  return (
    <>
      <div className="space-y-6">
        <SectionTitle>{draft.title}</SectionTitle>

        {draft.description.trim() !== '' && (
          <p className="text-foreground whitespace-pre-wrap">{draft.description}</p>
        )}

        <BoardFrame expandOnMobile>
          <ThemedBoardThumbnail
            fen={draft.representativeFen}
            annotations={draft.annotations}
            className="w-full"
          />
        </BoardFrame>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">{tForm('fields.slug')}</dt>
          <dd className="font-mono">{draft.slug}</dd>
          <dt className="text-muted-foreground">{tForm('fields.fen')}</dt>
          <dd className="font-mono break-all">{draft.representativeFen}</dd>
          <dt className="text-muted-foreground">{t('statusLabel')}</dt>
          <dd>
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                draft.status === 'draft'
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100'
                  : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100'
              }`}
            >
              {draft.status === 'draft' ? t('statusDraft') : t('statusPublished')}
            </span>
          </dd>
        </dl>

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
            {draft.status === 'draft' ? t('createDraftCta') : t('createPublishedCta')}
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
