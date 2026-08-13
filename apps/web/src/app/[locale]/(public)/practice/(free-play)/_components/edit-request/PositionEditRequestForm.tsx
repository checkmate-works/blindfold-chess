'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useSubmitError } from '@/_hooks/useSubmitError';
import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import {
  Button,
  FieldError,
  FormActionFooter,
  FormErrorBanner,
  UnsavedChangesDialog,
  fieldBorderClass,
  fieldErrorProps,
} from '@/app/_components';
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

/** The controls a rejected submit can be anchored on. */
type PositionEditRequestField = 'tags' | 'comment';

/**
 * Which control owns each rejection. The guard failures (`banned`,
 * `alreadyHasPending`, `notFound`, …) own no control and stay in the
 * form-level banner.
 */
const FIELD_BY_ERROR: Record<string, PositionEditRequestField> = {
  invalidTheme: 'tags',
  invalidChunk: 'tags',
  invalidTagId: 'tags',
  nothingToAdd: 'tags',
  commentTooLong: 'comment',
};

const FIELD_ANCHOR_IDS: Record<PositionEditRequestField, string> = {
  // The picker is a composite of comboboxes and chips with no single input to
  // focus, so its section wrapper carries the anchor.
  tags: 'position-edit-req-tags',
  comment: 'position-edit-req-comment',
};

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
  const [submitted, setSubmitted] = useState(false);

  const submitError = useSubmitError<PositionEditRequestField>((field) => FIELD_ANCHOR_IDS[field]);
  const tagsError = submitError.messageFor('tags');
  const commentError = submitError.messageFor('comment');

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
    submitError.clear();
    setPending(true);

    const result = await submitPositionEditRequest({
      positionId,
      proposedThemeIds: addedThemes.map((theme) => theme.id),
      proposedChunkIds: addedChunks.map((chunk) => chunk.id),
      comment: comment.trim().length > 0 ? comment : null,
    });
    setPending(false);

    if ('error' in result) {
      // Shown against the control at fault — the comment cap is the reachable
      // one (the box has no client-side limit), and it used to be reported at
      // the top of the form, past the whole tag picker.
      submitError.report(
        FIELD_BY_ERROR[result.error] ?? null,
        localizePositionEditRequestError(result.error, t, WELL_KNOWN_ERRORS)
      );
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
        {/* Form-wide errors only — a rejection attributable to a control is
            rendered against that control instead. */}
        <FormErrorBanner ref={submitError.summaryRef} message={submitError.formMessage} />

        {/* `id` + `tabIndex` make the picker block a focus target: it has no
            single input a rejection about the chosen tags could land on. */}
        <div
          id="position-edit-req-tags"
          tabIndex={-1}
          role="group"
          aria-label={pickerLabels.section}
          aria-describedby={tagsError ? 'position-edit-req-tags-error' : undefined}
        >
          <TagPicker
            selectedThemes={addedThemes}
            selectedChunks={addedChunks}
            availableThemes={pickableThemes}
            availableChunks={pickableChunks}
            disabled={pending}
            onChange={handlePickerChange}
            labels={pickerLabels}
          />
          <FieldError id="position-edit-req-tags-error" message={tagsError} />
        </div>

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
            className={`w-full px-3 py-2 rounded border bg-card text-foreground ${fieldBorderClass(commentError)}`}
            {...fieldErrorProps('position-edit-req-comment-error', commentError)}
          />
          <FieldError id="position-edit-req-comment-error" message={commentError} />
        </div>

        {/*
         * Full-width primary submit with a quiet cancel text-link stacked
         * below — the app's shared form-footer convention (chunk EditRequestForm,
         * EditPositionForm, ChunkForm…). Cancel returns to the suggestions
         * review page via the locale-aware router (not <Link>/back) to stay
         * consistent with those siblings.
         */}
        <FormActionFooter
          cancel={{ label: t('actions.cancel'), onClick: requestDiscard, disabled: pending }}
        >
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
        </FormActionFooter>
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
