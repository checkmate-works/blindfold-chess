'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { useRouter } from '@/i18n/routing';

import { submitEditRequest } from '../_actions/submitEditRequest';

type Props = {
  chunkId: string;
  /** Current title — prefills the proposal field so the proposer edits a diff. */
  currentTitle: string;
  /** Current description — same prefill rationale. */
  currentDescription: string | null;
};

const WELL_KNOWN_ERRORS = new Set([
  'signInRequired',
  'banned',
  'rateLimited',
  'notFound',
  'ownerCannotPropose',
  'chunkNotDraft',
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
export function EditRequestForm({ chunkId, currentTitle, currentDescription }: Props) {
  const t = useTranslations('chunks.editRequests');
  const router = useRouter();

  const [proposedTitle, setProposedTitle] = useState(currentTitle);
  const [proposedDescription, setProposedDescription] = useState(currentDescription ?? '');
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function localizeError(code: string): string {
    return WELL_KNOWN_ERRORS.has(code) ? t(`errors.${code}` as 'errors.signInRequired') : code;
  }

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
      setError(localizeError(result.error));
      return;
    }

    // On success the page revalidates and the new request lands in the
    // list below; reset the form back to the prefilled values so the
    // proposer can immediately suggest something else if they want to.
    resetToPrefill();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{t('formHint')}</p>

      {error && (
        <div
          role="alert"
          className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm"
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="edit-req-title" className="block text-sm font-medium mb-1">
          {t('fields.title')}
        </label>
        <input
          id="edit-req-title"
          type="text"
          value={proposedTitle}
          onChange={(e) => setProposedTitle(e.target.value)}
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
        />
      </div>

      <div>
        <label htmlFor="edit-req-description" className="block text-sm font-medium mb-1">
          {t('fields.description')}
        </label>
        <textarea
          id="edit-req-description"
          value={proposedDescription}
          onChange={(e) => setProposedDescription(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
        />
      </div>

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

      <Button type="submit" variant="primary" disabled={pending} loading={pending}>
        {t('actions.submit')}
      </Button>
    </form>
  );
}
