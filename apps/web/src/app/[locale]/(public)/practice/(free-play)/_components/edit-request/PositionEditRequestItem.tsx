'use client';

import type { ReactNode } from 'react';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';

import type { EditRequestStatus } from '@/lib/edit-requests/shared';
import type { AuthorProfile } from '@/lib/users/author-profile';

import { EditRequestHeader } from '@/app/[locale]/_components/edit-request/EditRequestHeader';
import { EditRequestResolutionControls } from '@/app/[locale]/_components/edit-request/EditRequestResolutionControls';
import { useEditRequestResolution } from '@/app/[locale]/_components/edit-request/use-edit-request-resolution';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { acceptPositionEditRequest } from '../../_actions/acceptPositionEditRequest';
import { rejectPositionEditRequest } from '../../_actions/rejectPositionEditRequest';
import { withdrawPositionEditRequest } from '../../_actions/withdrawPositionEditRequest';
import { localizePositionEditRequestError } from './localize-error';

type Props = {
  requestId: string;
  status: EditRequestStatus;
  createdAt: Date;
  /** Proposer profile, or null when the proposer's account was hard-deleted. */
  proposer: AuthorProfile | null;
  proposerId: string | null;
  /** Detail-page path (no locale prefix) the accept / reject flow redirects to. */
  detailHref: string;
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

export function PositionEditRequestItem(props: Props) {
  const t = useTranslations('practice.positionEditRequests');
  const tToast = useTranslations('toast');
  const router = useRouter();
  const { showToast } = useToast();

  const resolution = useEditRequestResolution({
    resolve: (action) => {
      if (action === 'accept') return acceptPositionEditRequest(props.requestId);
      if (action === 'reject') return rejectPositionEditRequest(props.requestId);
      return withdrawPositionEditRequest(props.requestId);
    },
    localizeError: (code) => localizePositionEditRequestError(code, t, WELL_KNOWN_ERRORS),
    onResolved: (action) => {
      // Accept / reject are owner resolutions: send the owner back to the
      // position page with a toast confirming the outcome (the linked chunks
      // there reflect an accepted change). Withdraw is the proposer dropping
      // their own row — keep them on the list so they can submit a fresh one,
      // and surface a direct toast since there's no navigation to carry a
      // `?toast=` param.
      if (action === 'withdraw') {
        showToast(tToast('editRequestWithdrawn'), 'success');
        router.refresh();
        return;
      }
      const toast = action === 'accept' ? 'edit_request_accepted' : 'edit_request_rejected';
      router.push(`${props.detailHref}?toast=${toast}` as '/practice/position-memory/[id]');
    },
  });

  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-4">
      <EditRequestHeader
        proposer={props.proposer}
        createdAt={props.createdAt}
        status={props.status}
        locale={props.locale}
        labels={{
          deletedProposer: t('deletedProposer'),
          justNow: t('justNow'),
          status: t(`status.${props.status}` as 'status.pending'),
        }}
      />

      {props.diff}

      {props.comment && (
        <div className="rounded bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap break-words">
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t('proposerComment')}</p>
          {props.comment}
        </div>
      )}

      {resolution.error && (
        <p role="alert" className="text-sm text-destructive">
          {resolution.error}
        </p>
      )}

      <EditRequestResolutionControls
        resolution={resolution}
        viewerIsOwner={props.viewerIsOwner}
        viewerIsProposer={props.viewerIsProposer}
        isPending={props.status === 'pending'}
        // Positions frame rejecting a proposal as destructive; chunks do not.
        // Pre-existing divergence, preserved verbatim — see the prop's TSDoc.
        rejectVariant="destructive"
        labels={{
          accept: t('actions.accept'),
          reject: t('actions.reject'),
          withdraw: t('actions.withdraw'),
          cancel: t('actions.cancel'),
          acceptConfirm: {
            title: t('actions.acceptConfirmTitle'),
            message: t('actions.acceptConfirmMessage'),
            confirmText: t('actions.accept'),
          },
          rejectConfirm: {
            title: t('actions.rejectConfirmTitle'),
            message: t('actions.rejectConfirmMessage'),
            confirmText: t('actions.reject'),
          },
          withdrawConfirm: {
            title: t('actions.withdrawConfirmTitle'),
            message: t('actions.withdrawConfirmMessage'),
            confirmText: t('actions.withdraw'),
          },
        }}
      />
    </div>
  );
}
