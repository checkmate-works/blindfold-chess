'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { BoardFrame, Button, FormErrorBanner, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';

import { SectionTitle } from '@/app/[locale]/_components';

import { createChunk } from '../_actions/createChunk';
import { saveChunkEdit, submitChunkPublish } from '../_lib/chunk-form-actions';
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
  'cannotEditPublished',
]);

type Props =
  | { mode: 'create' }
  /** `editHref` is the edit form to return to (e.g. `/chunks/foo/edit`). */
  | { mode: 'edit'; editHref: string };

/**
 * Read the chunk draft and present it for confirmation before persisting.
 * Shared by both authoring flows — create (`/chunks/new/preview`) and edit
 * (`/chunks/<slug>/edit/preview`) — so the review step looks identical:
 *
 * 1. On mount, read the draft. If absent (deep link or stale tab), bounce
 *    back to the form (`/chunks/new` for create, `editHref` for edit).
 * 2. Render the title, description, board (with annotations), and slug for
 *    the author to verify.
 * 3. Confirm →
 *      - create: `createChunk`; on success clear the draft and navigate to
 *        `/chunks/<slug>`, appending `?coinsEarned=N` to surface the
 *        coin-reward toast when a point grant fired.
 *      - edit: `updateChunk` (via `saveChunkEdit`), then `publishChunk`
 *        when the "Save as draft" toggle was off (`draft.status`); on
 *        success clear the draft and navigate to the (possibly renamed)
 *        `/chunks/<slug>` with `?toast=chunk_updated` (or `chunk_published`).
 * 4. "Back to edit" → keep the draft, navigate back to the form with a
 *    `?resumed=1` marker so create suppresses the "draft restored" banner
 *    and edit rehydrates the draft instead of the untouched server row.
 */
export function ChunkPreviewClient(props: Props) {
  const { mode } = props;
  const backHref = mode === 'edit' ? props.editHref : '/chunks/new';

  const t = useTranslations('chunks.preview');
  const tForm = useTranslations('chunks.form');
  const tUnsaved = useTranslations('unsavedChanges');
  const router = useRouter();

  const [draft, setDraft] = useState<ChunkDraftV1 | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Flips true on intentional pushes (save-success or back-to-edit) so
  // the dirty guard doesn't intercept our own navigation.
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const d = readChunkDraft();
    // Edit previews require an edit draft; a missing or create-shaped
    // draft in the shared slot means the author deep-linked or the tab
    // is stale — bounce them back to the form.
    if (!d || (mode === 'edit' && !d.edit)) {
      router.replace(backHref);
      return;
    }
    setDraft(d);
    setHydrated(true);
  }, [router, mode, backHref]);

  const isDirty = hydrated && !submitted;
  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  async function handleConfirm() {
    if (!draft) return;
    setPending(true);
    setError(null);
    try {
      if (mode === 'edit') {
        if (!draft.edit) return;
        // Save the edited fields first — always. Publishing then reads the
        // now-current description from the row (`publishChunkEntry` requires
        // a non-empty one), so the save must land before the publish call.
        const result = await saveChunkEdit({
          initialId: draft.edit.chunkId,
          initialSlug: draft.edit.initialSlug,
          payload: {
            representativeFen: draft.representativeFen,
            title: draft.title,
            slug: draft.slug,
            description: draft.description,
            annotations: draft.annotations,
            feedbackTopics: draft.feedbackTopics,
          },
          t: tForm,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }

        // Draft toggle off → publish the just-saved draft (one-way).
        if (draft.status === 'published') {
          const publishResult = await submitChunkPublish({ chunkId: draft.edit.chunkId, t: tForm });
          if (!publishResult.ok) {
            setError(publishResult.error);
            return;
          }
        }

        clearChunkDraft();
        flushSync(() => setSubmitted(true));
        // Land on the (possibly renamed) detail URL with a toast reflecting
        // what happened — publish vs. a plain save.
        const toast = draft.status === 'published' ? 'chunk_published' : 'chunk_updated';
        router.push(`/chunks/${result.targetSlug}?toast=${toast}` as '/chunks/[slug]');
        return;
      }

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
      setError(mode === 'edit' ? t('saveError') : t('createError'));
    } finally {
      setPending(false);
    }
  }

  function handleBackToEdit() {
    // Draft stays in sessionStorage so the form rehydrates. Flip
    // `submitted` so isDirty drops before our intentional push.
    flushSync(() => setSubmitted(true));
    // `?resumed=1` tells the form this return is intentional: create
    // suppresses the "draft restored" banner, edit rehydrates the draft
    // instead of the untouched server row. The form strips the marker.
    router.push(`${backHref}?resumed=1` as '/chunks/[slug]');
  }

  if (!hydrated || !draft) {
    return <div className="h-32 animate-pulse rounded bg-muted/30" />;
  }

  // Publishing (draft toggle off) reads the same CTA in both modes. When
  // staying a draft, create offers "Save as draft" and edit "Save changes".
  const confirmLabel =
    draft.status === 'published'
      ? t('createPublishedCta')
      : mode === 'edit'
        ? t('saveCta')
        : t('createDraftCta');

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

        <FormErrorBanner message={error} />

        <div className="flex flex-col gap-3 pt-2">
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            disabled={pending}
            loading={pending}
            onClick={handleConfirm}
          >
            {confirmLabel}
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
