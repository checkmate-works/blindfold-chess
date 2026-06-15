'use client';

import { type ReactNode, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { useRouter } from '@/i18n/routing';

import type { PositionEditRequestStatus } from '@/lib/position-edit-requests/validation';

import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';

import { acceptPositionEditRequest } from '../../_actions/acceptPositionEditRequest';
import { rejectPositionEditRequest } from '../../_actions/rejectPositionEditRequest';
import { withdrawPositionEditRequest } from '../../_actions/withdrawPositionEditRequest';
import { localizePositionEditRequestError } from './localize-error';

type ProposerProfile = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
} | null;

type Props = {
  requestId: string;
  status: PositionEditRequestStatus;
  createdAt: Date;
  /** Proposer profile, or null when the proposer's account was hard-deleted. */
  proposer: ProposerProfile;
  proposerId: string | null;
  /**
   * The added / removed chunk diff, rendered server-side (standard chunk
   * cards) and passed through the client boundary so the visual stays
   * consistent with `RelatedTags` without pulling board-rendering into
   * this client component.
   */
  diff: ReactNode;
  /** Optional proposer rationale. */
  comment: string | null;
  /** Viewer role flags resolved server-side. */
  viewerIsOwner: boolean;
  viewerIsProposer: boolean;
  locale: string;
};

const WELL_KNOWN_ERRORS = new Set([
  'signInRequired',
  'banned',
  'rateLimited',
  'unauthorized',
  'notFound',
  'alreadyResolved',
]);

const STATUS_BADGE_CLASS: Record<PositionEditRequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  accepted: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
  rejected: 'bg-rose-100 text-rose-900 dark:bg-rose-900 dark:text-rose-100',
  withdrawn: 'bg-muted text-muted-foreground',
};

export function PositionEditRequestItem(props: Props) {
  const t = useTranslations('practice.positionEditRequests');
  const router = useRouter();

  const [pending, setPending] = useState<null | 'accept' | 'reject' | 'withdraw'>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'accept' | 'reject' | 'withdraw'>(null);

  async function runResolution(kind: 'accept' | 'reject' | 'withdraw') {
    setError(null);
    setPending(kind);
    let result;
    if (kind === 'accept') result = await acceptPositionEditRequest(props.requestId);
    else if (kind === 'reject') result = await rejectPositionEditRequest(props.requestId);
    else result = await withdrawPositionEditRequest(props.requestId);
    setPending(null);
    setConfirm(null);

    if ('error' in result) {
      setError(localizePositionEditRequestError(result.error, t, WELL_KNOWN_ERRORS));
      return;
    }
    router.refresh();
  }

  const proposerName =
    props.proposer?.displayName ?? props.proposer?.username ?? t('deletedProposer');
  const profileHref = props.proposer?.username ? `/u/${props.proposer.username}` : null;

  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserAvatar
            profileHref={profileHref}
            avatarUrl={props.proposer?.avatarUrl ?? null}
            displayName={proposerName}
            locale={props.locale}
            size="sm"
          />
          <span className="text-xs text-muted-foreground">
            <time dateTime={props.createdAt.toISOString()}>
              {formatRelativeTime(props.createdAt, props.locale, t('justNow'))}
            </time>
          </span>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[props.status]}`}
        >
          {t(`status.${props.status}` as 'status.pending')}
        </span>
      </div>

      {props.diff}

      {props.comment && (
        <div className="rounded bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap break-words">
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t('proposerComment')}</p>
          {props.comment}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {props.status === 'pending' && (props.viewerIsOwner || props.viewerIsProposer) && (
        <div className="flex flex-col gap-2">
          {props.viewerIsOwner && (
            <>
              <Button
                type="button"
                variant="primary"
                fullWidth
                disabled={pending !== null}
                loading={pending === 'accept'}
                onClick={() => setConfirm('accept')}
              >
                {t('actions.accept')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                fullWidth
                disabled={pending !== null}
                loading={pending === 'reject'}
                onClick={() => setConfirm('reject')}
              >
                {t('actions.reject')}
              </Button>
            </>
          )}
          {props.viewerIsProposer && (
            <Button
              type="button"
              variant="destructive"
              fullWidth
              disabled={pending !== null}
              loading={pending === 'withdraw'}
              onClick={() => setConfirm('withdraw')}
            >
              {t('actions.withdraw')}
            </Button>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={confirm === 'accept'}
        title={t('actions.acceptConfirmTitle')}
        message={t('actions.acceptConfirmMessage')}
        confirmText={t('actions.accept')}
        cancelText={t('actions.cancel')}
        confirmVariant="primary"
        onConfirm={() => runResolution('accept')}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmationModal
        isOpen={confirm === 'reject'}
        title={t('actions.rejectConfirmTitle')}
        message={t('actions.rejectConfirmMessage')}
        confirmText={t('actions.reject')}
        cancelText={t('actions.cancel')}
        confirmVariant="danger"
        onConfirm={() => runResolution('reject')}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmationModal
        isOpen={confirm === 'withdraw'}
        title={t('actions.withdrawConfirmTitle')}
        message={t('actions.withdrawConfirmMessage')}
        confirmText={t('actions.withdraw')}
        cancelText={t('actions.cancel')}
        confirmVariant="danger"
        onConfirm={() => runResolution('withdraw')}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
