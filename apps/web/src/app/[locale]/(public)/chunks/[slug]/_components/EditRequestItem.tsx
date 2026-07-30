'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { useRouter } from '@/i18n/routing';

import type { EditRequestStatus } from '@/lib/edit-requests/shared';

import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { localizeChunkError } from '../../_lib/localize-error';
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
  status: EditRequestStatus;
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
  /** Viewer role flags resolved server-side. */
  viewerIsOwner: boolean;
  viewerIsProposer: boolean;
  /**
   * How many live positions / game moves already point at this chunk.
   * Accepting a title proposal renames the chunk those references were
   * made against, so the confirm step says so — the same warning the edit
   * form raises for a hand-typed rename, at the other door into it.
   */
  referenceCount: number;
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

const STATUS_BADGE_CLASS: Record<EditRequestStatus, string> = {
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
  const tToast = useTranslations('toast');
  const router = useRouter();
  const { showToast } = useToast();

  const [pending, setPending] = useState<null | 'accept' | 'reject' | 'withdraw'>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'accept' | 'reject' | 'withdraw'>(null);

  async function runResolution(kind: 'accept' | 'reject' | 'withdraw') {
    setError(null);
    setPending(kind);
    let result;
    if (kind === 'accept') result = await acceptEditRequest(props.requestId);
    else if (kind === 'reject') result = await rejectEditRequest(props.requestId);
    else result = await withdrawEditRequest(props.requestId);
    setPending(null);
    setConfirm(null);

    if ('error' in result) {
      setError(localizeChunkError(result.error, t, WELL_KNOWN_ERRORS));
      return;
    }

    // Withdraw keeps the proposer on the list (so they can submit a fresh
    // one), so there's no navigation to carry a `?toast=` param — fire the
    // confirmation toast directly. Accept / reject stay a silent refresh.
    if (kind === 'withdraw') {
      showToast(tToast('editRequestWithdrawn'), 'success');
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

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {props.status === 'pending' && (props.viewerIsOwner || props.viewerIsProposer) && (
        // Stack vertically + full width so the resolution surface
        // matches the rest of the chunk forms (where primary actions
        // span the row), and so the Accept / Reject pair on a
        // narrow screen never wraps mid-button. Accept is primary
        // (the recommended action — the visitor proposed an
        // improvement), Reject is secondary, Withdraw uses the
        // destructive variant since the proposer is removing their
        // own submitted work and the confirmation modal frames it
        // as such.
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
                variant="secondary"
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
        // A description-only proposal changes nothing an existing
        // reference rests on, so it keeps the plain message however many
        // links there are.
        message={
          props.proposedTitle !== null && props.referenceCount > 0
            ? `${t('actions.acceptConfirmMessage')} ${t('actions.acceptConfirmReferenceWarning', {
                count: props.referenceCount,
              })}`
            : t('actions.acceptConfirmMessage')
        }
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
