'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { useRouter } from '@/i18n/routing';

import type { ChunkFeedbackTopic } from '@/lib/chunks/validation';

import { localizeChunkError } from '../../_lib/localize-error';
import { submitEditRequest } from '../_actions/submitEditRequest';

type Props = {
  chunkId: string;
  /**
   * Used to build the post-submit redirect to the chunk detail page.
   * The slug is fixed at chunk creation so it's safe to pass once at
   * render time rather than re-deriving on every navigation.
   */
  chunkSlug: string;
  /** Current title — prefills the proposal field so the proposer edits a diff. */
  currentTitle: string;
  /** Current description — same prefill rationale. */
  currentDescription: string | null;
  /**
   * Fields the author has flagged via the chunk form as wanting
   * feedback on. The corresponding form field renders an inline
   * "wanted" badge so the proposer can default to writing where their
   * input is most welcome.
   */
  requestedFeedbackTopics?: readonly ChunkFeedbackTopic[];
  /** Localized label for the inline "wanted" badge (e.g. "Wanted"). */
  wantedLabel?: string;
  /**
   * Field the proposer arrived to edit, from the `?topic=` deep link on
   * the detail-page callout pills. On mount the matching field is focused
   * and scrolled into view; if it's a field the author didn't flag (so it
   * lives in the disclosure) the disclosure opens too.
   */
  focusTopic?: ChunkFeedbackTopic;
};

function WantedBadge({ label }: { label: string }) {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
      {label}
    </span>
  );
}

const WELL_KNOWN_ERRORS = new Set([
  'signInRequired',
  'banned',
  'rateLimited',
  'notFound',
  'ownerCannotPropose',
  'blocked',
  'chunkNotDraft',
  'alreadyHasPending',
]);

/**
 * Submitter-side form for the "Suggest an edit" flow.
 *
 * Rendered inline on the dedicated `/chunks/[slug]/edit-requests` page
 * for any signed-in non-owner. The previous toggle-open CTA was removed
 * once the form moved to a dedicated page — the user landed here
 * *because* they wanted to suggest something, so make the form visible
 * straight away and skip the extra click.
 *
 * Fields are prefilled with the chunk's current values so the proposer
 * edits what they want to change; the mutation core rejects no-op
 * submissions (every field identical to current).
 */
export function EditRequestForm({
  chunkId,
  chunkSlug,
  currentTitle,
  currentDescription,
  requestedFeedbackTopics,
  wantedLabel,
  focusTopic,
}: Props) {
  const t = useTranslations('chunks.editRequests');
  const router = useRouter();

  const titleWanted = !!requestedFeedbackTopics?.includes('title');
  const descriptionWanted = !!requestedFeedbackTopics?.includes('description');
  const badgeLabel = wantedLabel ?? '';

  // When the author narrowed their feedback to a subset of fields, keep
  // only the flagged field(s) up front and tuck the rest behind a
  // disclosure — so a proposer who was told "I only want input on the
  // Title" isn't confronted with the full description textarea as if the
  // whole record were up for editing. The row model already stores a
  // per-field proposal (untouched fields go in as NULL), so the collapsed
  // field simply stays at its prefill and is submitted as "no change".
  // When the author flagged nothing (or everything), there's no scope to
  // apply — show both fields as before.
  const someTopicsFlagged = titleWanted || descriptionWanted;
  const titlePrimary = !someTopicsFlagged || titleWanted;
  const descriptionPrimary = !someTopicsFlagged || descriptionWanted;

  // A deep-linked field that the author did NOT flag lives in the
  // disclosure — open it so the focus target is visible on arrival.
  const focusIsSecondary =
    (focusTopic === 'title' && !titlePrimary) ||
    (focusTopic === 'description' && !descriptionPrimary);

  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [proposedTitle, setProposedTitle] = useState(currentTitle);
  const [proposedDescription, setProposedDescription] = useState(currentDescription ?? '');
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherOpen, setOtherOpen] = useState(focusIsSecondary);

  // Focus + scroll the deep-linked field into view on arrival so the
  // proposer lands directly on what the callout pill promised.
  useEffect(() => {
    if (!focusTopic) return;
    const el = focusTopic === 'title' ? titleRef.current : descriptionRef.current;
    el?.focus();
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focusTopic]);

  function resetToPrefill() {
    setProposedTitle(currentTitle);
    setProposedDescription(currentDescription ?? '');
    setComment('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    // Only send a field when the proposer actually changed it — keeps
    // the row's `proposed_*` columns sparse and avoids the server-side
    // "identical to current" guard rejecting a half-empty submission.
    const titleChanged = proposedTitle.trim() !== currentTitle.trim();
    const descChanged = proposedDescription.trim() !== (currentDescription ?? '').trim();

    const result = await submitEditRequest({
      chunkId,
      proposedTitle: titleChanged ? proposedTitle : null,
      proposedDescription: descChanged ? proposedDescription : null,
      comment: comment.trim().length > 0 ? comment : null,
    });
    setPending(false);

    if ('error' in result) {
      setError(localizeChunkError(result.error, t, WELL_KNOWN_ERRORS));
      return;
    }

    // On success, navigate back to the chunk detail page — the
    // suggestion was for the chunk, not for the suggestion-list page,
    // so the detail page is the more natural landing surface. A
    // `?toast=` param triggers the global ToastContainer to show a
    // success confirmation once the new page is hydrated.
    resetToPrefill();
    router.push(`/chunks/${chunkSlug}?toast=edit_request_submitted` as '/chunks/[slug]');
  }

  const titleField = (
    <div>
      <label htmlFor="edit-req-title" className="block text-sm font-medium mb-1">
        {t('fields.title')}
        {titleWanted && badgeLabel && <WantedBadge label={badgeLabel} />}
      </label>
      <input
        ref={titleRef}
        id="edit-req-title"
        type="text"
        value={proposedTitle}
        onChange={(e) => setProposedTitle(e.target.value)}
        className={`w-full px-3 py-2 rounded border bg-card text-foreground ${
          titleWanted ? 'border-amber-400 dark:border-amber-600' : 'border-border'
        }`}
      />
    </div>
  );

  const descriptionField = (
    <div>
      <label htmlFor="edit-req-description" className="block text-sm font-medium mb-1">
        {t('fields.description')}
        {descriptionWanted && badgeLabel && <WantedBadge label={badgeLabel} />}
      </label>
      <textarea
        ref={descriptionRef}
        id="edit-req-description"
        value={proposedDescription}
        onChange={(e) => setProposedDescription(e.target.value)}
        rows={4}
        className={`w-full px-3 py-2 rounded border bg-card text-foreground ${
          descriptionWanted ? 'border-amber-400 dark:border-amber-600' : 'border-border'
        }`}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-muted-foreground">{t('formHint')}</p>

      {error && (
        <div
          role="alert"
          className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm"
        >
          {error}
        </div>
      )}

      {titlePrimary && titleField}
      {descriptionPrimary && descriptionField}

      {/*
       * Secondary fields — the ones the author did NOT flag. Kept mounted
       * inside a <details> (not conditionally unmounted) so a proposer who
       * opens it, types, then collapses it doesn't lose their edit. They
       * stay at prefill until touched, so a never-opened field is submitted
       * as "no change".
       */}
      {(!titlePrimary || !descriptionPrimary) && (
        <details
          open={otherOpen}
          onToggle={(e) => setOtherOpen(e.currentTarget.open)}
          className="rounded border border-border bg-muted/30 px-3 py-2"
        >
          <summary className="cursor-pointer select-none text-sm font-medium text-muted-foreground">
            {t('otherFieldsToggle')}
          </summary>
          <div className="mt-3 space-y-4">
            {!titlePrimary && titleField}
            {!descriptionPrimary && descriptionField}
          </div>
        </details>
      )}

      <div>
        <label htmlFor="edit-req-comment" className="block text-sm font-medium mb-1">
          {t('fields.comment')}
        </label>
        <textarea
          id="edit-req-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={t('fields.commentPlaceholder')}
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
        />
      </div>

      {/*
       * Full-width primary submit with a quiet cancel text-link stacked
       * below — the app's shared form-footer convention (EditLineForm,
       * EditPositionForm, ChunkForm…). Cancel returns to the chunk detail
       * page via router.push (not <Link>/back) to stay locale-aware and
       * consistent with those siblings.
       */}
      <div className="space-y-4">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={pending}
          loading={pending}
        >
          {t('actions.submit')}
        </Button>
        <button
          type="button"
          onClick={() => router.push(`/chunks/${chunkSlug}` as '/chunks/[slug]')}
          disabled={pending}
          className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {t('actions.cancel')}
        </button>
      </div>
    </form>
  );
}
