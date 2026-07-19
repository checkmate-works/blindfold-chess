'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Select, Textarea } from '@/app/admin/_components/forms';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { grantRank } from '../../_actions/grantRank';

type RankOption = { slug: string; label: string };

type Props = {
  userId: string;
  /** Ranks the user does not already hold, ascending by level. */
  availableRanks: RankOption[];
};

const ERROR_MESSAGES: Record<string, string> = {
  invalidRank: 'Unknown rank.',
  reasonRequired: 'Reason is required.',
  reasonTooLong: 'Reason is too long.',
  rankNotFound: 'That rank has no matching database row yet.',
  alreadyGranted: 'This user already holds that rank.',
  unauthorized: 'You are not authorized to do this.',
  failedToGrantRank: 'Failed to grant rank.',
};

export function GrantRankButton({ userId, availableRanks }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rankSlug, setRankSlug] = useState(availableRanks[0]?.slug ?? '');
  const [reason, setReason] = useState('');

  if (availableRanks.length === 0) {
    return null;
  }

  async function handleGrant() {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError(ERROR_MESSAGES.reasonRequired);
      return;
    }

    setIsPending(true);
    setError(null);

    const result = await grantRank(userId, rankSlug, trimmedReason);

    if ('error' in result) {
      setError(ERROR_MESSAGES[result.error] ?? result.error);
      setIsPending(false);
    } else {
      setIsOpen(false);
      setIsPending(false);
      setReason('');
      const remaining = availableRanks.filter((r) => r.slug !== rankSlug);
      setRankSlug(remaining[0]?.slug ?? '');
      router.refresh();
    }
  }

  function handleCancel() {
    setIsOpen(false);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1 text-xs font-medium rounded border border-border bg-card text-foreground hover:bg-secondary transition-colors"
      >
        Grant Rank
      </button>

      <ConfirmationModal
        isOpen={isOpen}
        title="Grant Rank"
        confirmText={isPending ? 'Granting...' : 'Confirm Grant'}
        cancelText="Cancel"
        isLoading={isPending}
        error={error}
        onConfirm={handleGrant}
        onCancel={handleCancel}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor={`grant-rank-slug-${userId}`} className="block text-sm font-medium mb-2">
              Rank
            </label>
            <Select
              id={`grant-rank-slug-${userId}`}
              value={rankSlug}
              onChange={(e) => setRankSlug(e.target.value)}
              fullWidth
            >
              {availableRanks.map((rank) => (
                <option key={rank.slug} value={rank.slug}>
                  {rank.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label
              htmlFor={`grant-rank-reason-${userId}`}
              className="block text-sm font-medium mb-2"
            >
              Reason
            </label>
            <Textarea
              id={`grant-rank-reason-${userId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              fullWidth
              placeholder="Why is this rank being granted manually? (e.g., 'Met the 1dan requirement before the rank shipped')"
            />
          </div>
        </div>
      </ConfirmationModal>
    </>
  );
}
