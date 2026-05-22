'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { useRouter } from '@/i18n/routing';

import type { ChunkEditRequestStatus } from '@/lib/chunk-edit-requests/validation';

import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';

import { acceptEditRequest } from '../_actions/acceptEditRequest';
import { rejectEditRequest } from '../_actions/rejectEditRequest';
import { withdrawEditRequest } from '../_actions/withdrawEditRequest';

type ProposerProfile = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
} | null;

type Props = {
  requestId: string;
  status: ChunkEditRequestStatus;
  createdAt: Date;
  /** Proposer profile, or null when the proposer's account was hard-deleted. */
  proposer: ProposerProfile;
  proposerId: string | null;
  proposedTitle: string | null;
  proposedDescription: string | null;
  /** Current values shown next to the proposed value as a side-by-side diff. */
  currentTitle: string;
  currentDescription: string | null;
  /** Optional proposer rationale. */
  comment: string | null;
  /** Owner's response when status === 'rejected'. */
  resolverComment: string | null;
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
  'chunkNotDraft',
]);

const STATUS_BADGE_CLASS: Record<ChunkEditRequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  accepted: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
  rejected: 'bg-rose-100 text-rose-900 dark:bg-rose-900 dark:text-rose-100',
  withdrawn: 'bg-muted text-muted-foreground',
};

function ChangedFieldDiff({
  label,
  beforeHeader,
  afterHeader,
  before,
  after,
}: {
  label: string;
  beforeHeader: string;
  afterHeader: string;
  before: string;
  after: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded border border-border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap break-words">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {beforeHeader}
          </p>
          <span className="text-muted-foreground">{before}</span>
        </div>
        <div className="rounded border border-primary/40 bg-primary/5 px-3 py-2 text-sm whitespace-pre-wrap break-words">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-primary">
            {afterHeader}
          </p>
          <span className="text-foreground">{after}</span>
        </div>
      </div>
    </div>
  );
}

export function EditRequestItem(props: Props) {
  const t = useTranslations('chunks.editRequests');
  const router = useRouter();

  const [pending, setPending] = useState<null | 'accept' | 'reject' | 'withdraw'>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'accept' | 'reject' | 'withdraw'>(null);
  const [rejectComment, setRejectComment] = useState('');

  function localizeError(code: string): string {
    return WELL_KNOWN_ERRORS.has(code) ? t(`errors.${code}` as 'errors.signInRequired') : code;
  }

  async function runResolution(kind: 'accept' | 'reject' | 'withdraw') {
    setError(null);
    setPending(kind);
    let result;
    if (kind === 'accept') result = await acceptEditRequest(props.requestId);
    else if (kind === 'reject')
      result = await rejectEditRequest(
        props.requestId,
        rejectComment.trim().length === 0 ? null : rejectComment
      );
    else result = await withdrawEditRequest(props.requestId);
    setPending(null);
    setConfirm(null);

    if ('error' in result) {
      setError(localizeError(result.error));
      return;
    }
    setRejectComment('');
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

      {props.proposedTitle !== null && (
        <ChangedFieldDiff
          label={t('diff.titleLabel')}
          beforeHeader={t('diff.current')}
          afterHeader={t('diff.proposed')}
          before={props.currentTitle}
          after={props.proposedTitle}
        />
      )}

      {props.proposedDescription !== null && (
        <ChangedFieldDiff
          label={t('diff.descriptionLabel')}
          beforeHeader={t('diff.current')}
          afterHeader={t('diff.proposed')}
          before={props.currentDescription ?? ''}
          after={props.proposedDescription}
        />
      )}

      {props.comment && (
        <div className="rounded bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap break-words">
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t('proposerComment')}</p>
          {props.comment}
        </div>
      )}

      {props.status === 'rejected' && props.resolverComment && (
        <div className="rounded bg-rose-50 px-3 py-2 text-sm whitespace-pre-wrap break-words dark:bg-rose-950/40">
          <p className="mb-1 text-xs font-medium text-rose-900 dark:text-rose-200">
            {t('resolverComment')}
          </p>
          {props.resolverComment}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {props.status === 'pending' && (props.viewerIsOwner || props.viewerIsProposer) && (
        <div className="flex flex-wrap gap-2">
          {props.viewerIsOwner && (
            <>
              <Button
                type="button"
                variant="primary"
                disabled={pending !== null}
                loading={pending === 'accept'}
                onClick={() => setConfirm('accept')}
              >
                {t('actions.accept')}
              </Button>
              <Button
                type="button"
                variant="secondary"
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
              variant="secondary"
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
      >
        <div className="mt-3">
          <label
            htmlFor={`reject-comment-${props.requestId}`}
            className="block text-sm font-medium mb-1"
          >
            {t('actions.rejectCommentLabel')}
          </label>
          <textarea
            id={`reject-comment-${props.requestId}`}
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            rows={3}
            placeholder={t('actions.rejectCommentPlaceholder')}
            className="w-full px-3 py-2 rounded border border-border bg-card text-foreground text-sm"
          />
        </div>
      </ConfirmationModal>

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
