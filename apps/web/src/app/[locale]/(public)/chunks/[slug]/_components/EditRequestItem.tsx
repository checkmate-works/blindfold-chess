'use client';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';

import type { EditRequestStatus } from '@/lib/edit-requests/shared';
import { localizeActionError } from '@/lib/i18n/localize-action-error';
import type { AuthorProfile } from '@/lib/users/author-profile';

import { EditRequestHeader } from '@/app/[locale]/_components/edit-request/EditRequestHeader';
import { EditRequestResolutionControls } from '@/app/[locale]/_components/edit-request/EditRequestResolutionControls';
import { useEditRequestResolution } from '@/app/[locale]/_components/edit-request/use-edit-request-resolution';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { acceptEditRequest } from '../_actions/acceptEditRequest';
import { rejectEditRequest } from '../_actions/rejectEditRequest';
import { withdrawEditRequest } from '../_actions/withdrawEditRequest';

type Props = {
  requestId: string;
  status: EditRequestStatus;
  createdAt: Date;
  /** Proposer profile, or null when the proposer's account was hard-deleted. */
  proposer: AuthorProfile | null;
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

  const resolution = useEditRequestResolution({
    resolve: (action) => {
      if (action === 'accept') return acceptEditRequest(props.requestId);
      if (action === 'reject') return rejectEditRequest(props.requestId);
      return withdrawEditRequest(props.requestId);
    },
    localizeError: (code) => localizeActionError(code, t, WELL_KNOWN_ERRORS),
    onResolved: (action) => {
      // Withdraw keeps the proposer on the list (so they can submit a fresh
      // one), so there's no navigation to carry a `?toast=` param — fire the
      // confirmation toast directly. Accept / reject stay a silent refresh.
      if (action === 'withdraw') {
        showToast(tToast('editRequestWithdrawn'), 'success');
      }
      router.refresh();
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
        // Chunks treat rejecting a proposal as an ordinary secondary action;
        // positions treat it as destructive. Pre-existing divergence,
        // preserved verbatim — see the prop's TSDoc.
        rejectVariant="secondary"
        labels={{
          accept: t('actions.accept'),
          reject: t('actions.reject'),
          withdraw: t('actions.withdraw'),
          cancel: t('actions.cancel'),
          acceptConfirm: {
            title: t('actions.acceptConfirmTitle'),
            // A description-only proposal changes nothing an existing
            // reference rests on, so it keeps the plain message however many
            // links there are.
            message:
              props.proposedTitle !== null && props.referenceCount > 0
                ? `${t('actions.acceptConfirmMessage')} ${t(
                    'actions.acceptConfirmReferenceWarning',
                    {
                      count: props.referenceCount,
                    }
                  )}`
                : t('actions.acceptConfirmMessage'),
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
