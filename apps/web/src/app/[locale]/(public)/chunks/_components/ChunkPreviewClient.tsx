'use client';

import { useEffect, useState } from 'react';

import { useLocale, useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';

import { SectionTitle } from '@/app/[locale]/_components';

import { createChunk } from '../_actions/createChunk';
import { type ChunkDraftV1, clearChunkDraft, readChunkDraft } from '../_lib/draft-storage';

/**
 * Read the chunk draft and present it for confirmation before calling
 * `createChunk`. Mirrors `PuzzlePreviewClient` step-for-step:
 *
 * 1. On mount, read the draft. If absent (deep link or stale tab),
 *    bounce back to `/chunks/new`.
 * 2. Render the title, description, board (with annotations), and
 *    slug for the author to verify.
 * 3. "Create" → `createChunk`; on success clear the draft and route
 *    through `/thanks` when a point grant fired, otherwise straight to
 *    `/chunks/<slug>`.
 * 4. "Back to edit" → keep the draft, navigate to `/chunks/new`. The
 *    form rehydrates from sessionStorage so the author lands back on
 *    their state without re-entering anything.
 */
export function ChunkPreviewClient() {
  const t = useTranslations('chunks.preview');
  const tForm = useTranslations('chunks.form');
  const tUnsaved = useTranslations('unsavedChanges');
  const router = useRouter();
  const locale = useLocale();

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

  function localizeError(code: string): string {
    const wellKnown = new Set([
      'signInRequired',
      'banned',
      'rateLimited',
      'slugTaken',
      'notFound',
      'unauthorized',
      'alreadyDeleted',
    ]);
    return wellKnown.has(code) ? tForm(`errors.${code}` as 'errors.signInRequired') : code;
  }

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
      });
      if ('error' in result) {
        setError(localizeError(result.error));
        return;
      }
      clearChunkDraft();
      flushSync(() => setSubmitted(true));

      // Point grant fired → route via /thanks so the user lands on the
      // award screen, then continues to the chunk detail. No-grant flows
      // skip the celebration step.
      if (result.pointGrant) {
        const returnUrl = `/${locale}/chunks/${result.slug}`;
        router.push(
          `/thanks?pointEventId=${result.pointGrant.pointEventId}&returnUrl=${encodeURIComponent(returnUrl)}`
        );
      } else {
        router.push(`/chunks/${result.slug}` as '/chunks/[slug]');
      }
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

        <div className="max-w-xs mx-auto">
          <ThemedBoardThumbnail
            fen={draft.representativeFen}
            annotations={draft.annotations}
            className="w-full"
          />
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">{tForm('fields.slug')}</dt>
          <dd className="font-mono">{draft.slug}</dd>
          <dt className="text-muted-foreground">{tForm('fields.fen')}</dt>
          <dd className="font-mono break-all">{draft.representativeFen}</dd>
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
