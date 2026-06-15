'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { useRouter } from '@/i18n/routing';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { submitPositionEditRequest } from '../../_actions/submitPositionEditRequest';
import { useTagPickerLabels } from '../../_hooks/use-tag-picker-labels';
import { TagPicker } from '../TagPicker';
import { localizePositionEditRequestError } from './localize-error';

type Props = {
  positionId: string;
  /** The position's current linked chunks — seeds the picker selection. */
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
 * pending request. The chunk picker is seeded with the position's current
 * links so the proposer edits a diff; the mutation core rejects a no-op
 * (set identical to the current links).
 *
 * The `TagPicker` is reused with an empty theme catalog so only chunks are
 * selectable — themes are out of scope for position edit requests.
 */
export function PositionEditRequestForm({ positionId, currentChunks, availableChunks }: Props) {
  const t = useTranslations('practice.positionEditRequests');
  const pickerLabels = useTagPickerLabels();
  const router = useRouter();

  const [selectedChunks, setSelectedChunks] = useState<ChunkOption[]>(currentChunks);
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The picker is a theme+chunk control; we ignore the theme channel and
  // only track chunk selection.
  function handlePickerChange(_themes: ThemeOption[], chunks: ChunkOption[]) {
    setSelectedChunks(chunks);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const result = await submitPositionEditRequest({
      positionId,
      proposedChunkIds: selectedChunks.map((c) => c.id),
      comment: comment.trim().length > 0 ? comment : null,
    });
    setPending(false);

    if ('error' in result) {
      setError(localizePositionEditRequestError(result.error, t, WELL_KNOWN_ERRORS));
      return;
    }

    // Stay on the detail page; refresh so the new pending row appears and
    // the form is replaced by the "you already have a pending request"
    // notice (one-pending invariant).
    setComment('');
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

      <TagPicker
        selectedThemes={[]}
        selectedChunks={selectedChunks}
        availableThemes={[]}
        availableChunks={availableChunks}
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

      <Button type="submit" variant="primary" disabled={pending} loading={pending}>
        {t('actions.submit')}
      </Button>
    </form>
  );
}
