'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import type { ChunkOption } from '@/lib/chunks/types';
import type { PositionTagBundle } from '@/lib/positions/tag-loader';
import type { ThemeOption } from '@/lib/themes/types';

import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { submitPositionEditRequest } from '../../_actions/submitPositionEditRequest';
import { useTagPickerLabels } from '../../_hooks/use-tag-picker-labels';
import { TagPicker } from '../TagPicker';
import { localizePositionEditRequestError } from './localize-error';

type Props = {
  positionId: string;
  /** Themes + chunks already linked to the position. Excluded from the
   * picker's catalog (they're already there) and never re-submitted. */
  current: PositionTagBundle;
  /** Full picker catalog: theme-eligible glossary terms + published chunks. */
  available: PositionTagBundle;
  /**
   * Locale-less path the quiet "cancel" link returns to (the position's
   * suggestions review page). Routed through the locale-aware router.
   */
  cancelHref: string;
};

const WELL_KNOWN_ERRORS = new Set([
  'signInRequired',
  'banned',
  'rateLimited',
  'notFound',
  'ownerCannotPropose',
  'blocked',
  'alreadyHasPending',
  'invalidTheme',
  'invalidChunk',
  'invalidTagId',
  'nothingToAdd',
  'commentTooLong',
]);

/**
 * Submitter-side form for the "Suggest tags for this position" flow,
 * covering both tag kinds the position detail page shows together in its
 * "useful patterns" section: curated glossary themes and UGC chunks.
 *
 * Add-only: the picker starts empty and tracks what the proposer wants to
 * ADD, with already-linked tags filtered out of the catalog so they can be
 * neither re-proposed nor un-proposed. That matches the additive storage
 * (see the `position_edit_requests` schema TSDoc) — accepting inserts these
 * IDs and never removes anything the owner has since added.
 *
 * The `TagPicker` is used with its stock labels, exactly as the owner's
 * position create / edit forms use it.
 */
export function PositionEditRequestForm({ positionId, current, available, cancelHref }: Props) {
  const t = useTranslations('practice.positionEditRequests');
  const tToast = useTranslations('toast');
  const tUnsaved = useTranslations('unsavedChanges');
  const pickerLabels = useTagPickerLabels();
  const router = useRouter();
  const { showToast } = useToast();

  const [addedThemes, setAddedThemes] = useState<ThemeOption[]>([]);
  const [addedChunks, setAddedChunks] = useState<ChunkOption[]>([]);
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const linkedThemeIds = new Set(current.themes.map((theme) => theme.id));
  const linkedChunkIds = new Set(current.chunks.map((chunk) => chunk.id));
  const pickableThemes = available.themes.filter((theme) => !linkedThemeIds.has(theme.id));
  const pickableChunks = available.chunks.filter((chunk) => !linkedChunkIds.has(chunk.id));

  const nothingSelected = addedThemes.length === 0 && addedChunks.length === 0;

  // Any tag picked or comment typed makes the form dirty. `!submitted` drops
  // the guard once a successful submit resets the fields and refreshes.
  // Mirrors the sibling chunk EditRequestForm.
  const isDirty = !submitted && (!nothingSelected || comment.trim().length > 0);

  // Cancel routes to the suggestions review page below; when the form is
  // dirty the guard intercepts both that in-app cancel and any route/tab
  // exit, raising UnsavedChangesDialog instead of discarding silently.
  const { isBlocking, confirm, cancel, requestDiscard } = useUnsavedChanges({
    isDirty,
    onDiscard: () => router.push(cancelHref as '/practice/position-memory/[id]/suggestions'),
  });

  function handlePickerChange(themes: ThemeOption[], chunks: ChunkOption[]) {
    setAddedThemes(themes);
    setAddedChunks(chunks);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const result = await submitPositionEditRequest({
      positionId,
      proposedThemeIds: addedThemes.map((theme) => theme.id),
      proposedChunkIds: addedChunks.map((chunk) => chunk.id),
      comment: comment.trim().length > 0 ? comment : null,
    });
    setPending(false);

    if ('error' in result) {
      setError(localizePositionEditRequestError(result.error, t, WELL_KNOWN_ERRORS));
      return;
    }

    // Refresh instead of navigating: the viewer now has a pending request,
    // so this page's own server-side gate (see `PositionEditRequestNewView`)
    // redirects to the review list on refresh, where the new pending row
    // appears. The view doesn't navigate itself, so surface the confirmation
    // via a direct toast rather than a `?toast=` redirect param.
    setComment('');
    setAddedThemes([]);
    setAddedChunks([]);
    // Disable the unsaved-changes guard synchronously before the refresh so
    // the gate's redirect to the review page isn't caught as a dirty exit.
    flushSync(() => setSubmitted(true));
    showToast(tToast('editRequestSubmitted'), 'success');
    router.refresh();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm"
          >
            {error}
          </div>
        )}

        <TagPicker
          selectedThemes={addedThemes}
          selectedChunks={addedChunks}
          availableThemes={pickableThemes}
          availableChunks={pickableChunks}
          disabled={pending}
          onChange={handlePickerChange}
          labels={pickerLabels}
        />

        <div>
          <label htmlFor="position-edit-req-comment" className="block text-sm font-medium mb-1">
            {t('fields.comment')}
          </label>
          <textarea
            id="position-edit-req-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder={t('fields.commentPlaceholder')}
            className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
          />
        </div>

        {/*
         * Full-width primary submit with a quiet cancel text-link stacked
         * below — the app's shared form-footer convention (chunk EditRequestForm,
         * EditPositionForm, ChunkForm…). Cancel returns to the suggestions
         * review page via the locale-aware router (not <Link>/back) to stay
         * consistent with those siblings.
         */}
        <div className="space-y-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={pending || nothingSelected}
            loading={pending}
          >
            {t('actions.submit')}
          </Button>
          <button
            type="button"
            onClick={requestDiscard}
            disabled={pending}
            className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {t('actions.cancel')}
          </button>
        </div>
      </form>

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
