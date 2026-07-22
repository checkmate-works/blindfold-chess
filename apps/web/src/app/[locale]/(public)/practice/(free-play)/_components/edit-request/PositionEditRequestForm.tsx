'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { useRouter } from '@/i18n/routing';

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
};

const WELL_KNOWN_ERRORS = new Set([
  'signInRequired',
  'banned',
  'rateLimited',
  'notFound',
  'ownerCannotPropose',
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
export function PositionEditRequestForm({ positionId, current, available }: Props) {
  const t = useTranslations('practice.positionEditRequests');
  const tToast = useTranslations('toast');
  const pickerLabels = useTagPickerLabels();
  const router = useRouter();
  const { showToast } = useToast();

  const [addedThemes, setAddedThemes] = useState<ThemeOption[]>([]);
  const [addedChunks, setAddedChunks] = useState<ChunkOption[]>([]);
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkedThemeIds = new Set(current.themes.map((theme) => theme.id));
  const linkedChunkIds = new Set(current.chunks.map((chunk) => chunk.id));
  const pickableThemes = available.themes.filter((theme) => !linkedThemeIds.has(theme.id));
  const pickableChunks = available.chunks.filter((chunk) => !linkedChunkIds.has(chunk.id));

  const nothingSelected = addedThemes.length === 0 && addedChunks.length === 0;

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
    </form>
  );
}
