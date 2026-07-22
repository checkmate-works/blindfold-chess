'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { useRouter } from '@/i18n/routing';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { submitPositionEditRequest } from '../../_actions/submitPositionEditRequest';
import { useTagPickerLabels } from '../../_hooks/use-tag-picker-labels';
import { TagPicker } from '../TagPicker';
import { localizePositionEditRequestError } from './localize-error';

type Props = {
  positionId: string;
  /** The position's current linked chunks. Always kept in the submitted
   * proposal — not user-removable here — and excluded from the picker's
   * suggestions (they're already linked). */
  currentChunks: ChunkOption[];
  /** Published catalog of chunks the proposer may attach. */
  availableChunks: ChunkOption[];
};

const WELL_KNOWN_ERRORS = new Set([
  'signInRequired',
  'banned',
  'rateLimited',
  'notFound',
  'ownerCannotPropose',
  'alreadyHasPending',
  'invalidChunk',
  'invalidChunkId',
  'identicalChunkSet',
  'commentTooLong',
]);

/**
 * Submitter-side form for the "Suggest linked chunks" flow on a position
 * detail page. Rendered inline for any signed-in non-owner without a
 * pending request. Add-only: the picker tracks chunks the proposer wants to
 * attach, on top of (never instead of) the position's current links —
 * proposing removal of an already-linked chunk isn't supported here (that's
 * the owner's own edit form, not this suggestion flow). The submitted
 * proposal always merges `currentChunks` back in; the mutation core rejects
 * a no-op (set identical to the current links, i.e. nothing new picked).
 *
 * The `TagPicker` is reused with an empty theme catalog so only chunks are
 * selectable — themes are out of scope for position edit requests.
 */
export function PositionEditRequestForm({ positionId, currentChunks, availableChunks }: Props) {
  const t = useTranslations('practice.positionEditRequests');
  const tToast = useTranslations('toast');
  const pickerLabels = useTagPickerLabels();
  const router = useRouter();
  const { showToast } = useToast();

  const [addedChunks, setAddedChunks] = useState<ChunkOption[]>([]);
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentChunkIds = new Set(currentChunks.map((c) => c.id));
  const pickableChunks = availableChunks.filter((c) => !currentChunkIds.has(c.id));

  // The picker is a theme+chunk control; we ignore the theme channel and
  // only track chunk selection.
  function handlePickerChange(_themes: ThemeOption[], chunks: ChunkOption[]) {
    setAddedChunks(chunks);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const result = await submitPositionEditRequest({
      positionId,
      proposedChunkIds: [...currentChunks, ...addedChunks].map((c) => c.id),
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
    setAddedChunks([]);
    showToast(tToast('editRequestSubmitted'), 'success');
    router.refresh();
  }

  return (
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
        selectedThemes={[]}
        selectedChunks={addedChunks}
        availableThemes={[]}
        availableChunks={pickableChunks}
        disabled={pending}
        onChange={handlePickerChange}
        // The proposer picks chunks only (empty theme catalog), so the
        // shared "Themes vs. chunks" help line would be misleading here —
        // drop it. It still shows on the position create / edit forms,
        // where themes are selectable.
        labels={{ ...pickerLabels, help: undefined }}
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

      <Button type="submit" variant="primary" disabled={pending} loading={pending}>
        {t('actions.submit')}
      </Button>
    </form>
  );
}
