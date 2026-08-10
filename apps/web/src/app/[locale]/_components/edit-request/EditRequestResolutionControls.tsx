'use client';

import { Button } from '@/app/_components';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import type { EditRequestResolution } from './use-edit-request-resolution';

type ConfirmLabels = {
  title: string;
  message: string;
  confirmText: string;
};

type Props = {
  resolution: EditRequestResolution;
  /** Viewer role flags resolved server-side. */
  viewerIsOwner: boolean;
  viewerIsProposer: boolean;
  /** Hides the buttons once the request has left `pending`; modals stay mounted. */
  isPending: boolean;
  /**
   * Reject's button style. Not unified on purpose — the two surfaces already
   * ship different answers (chunks treat rejecting a proposal as an ordinary
   * secondary action, positions treat it as destructive) and picking one here
   * would be a silent UI change rather than a refactor. See the TSDoc on the
   * two call sites.
   */
  rejectVariant: 'secondary' | 'destructive';
  labels: {
    accept: string;
    reject: string;
    withdraw: string;
    cancel: string;
    acceptConfirm: ConfirmLabels;
    rejectConfirm: ConfirmLabels;
    withdrawConfirm: ConfirmLabels;
  };
};

/**
 * The accept / reject / withdraw buttons and their three confirmation modals.
 *
 * @description
 * Stacked vertically and full width so the resolution surface matches the rest
 * of the authoring forms (where primary actions span the row) and so the
 * accept / reject pair on a narrow screen never wraps mid-button. Accept is
 * primary — the visitor proposed an improvement, so taking it is the
 * recommended path. Withdraw is destructive: the proposer is removing their
 * own submitted work, and its confirmation frames it that way.
 *
 * Only the owner sees accept / reject and only the proposer sees withdraw, but
 * both can be true at once for a self-proposal, so these are independent
 * conditions rather than a branch.
 */
export function EditRequestResolutionControls({
  resolution,
  viewerIsOwner,
  viewerIsProposer,
  isPending,
  rejectVariant,
  labels,
}: Props) {
  const { pending, confirm, requestConfirm, cancelConfirm, run } = resolution;
  const disabled = pending !== null;

  return (
    <>
      {isPending && (viewerIsOwner || viewerIsProposer) && (
        <div className="flex flex-col gap-2">
          {viewerIsOwner && (
            <>
              <Button
                type="button"
                variant="primary"
                fullWidth
                disabled={disabled}
                loading={pending === 'accept'}
                onClick={() => requestConfirm('accept')}
              >
                {labels.accept}
              </Button>
              <Button
                type="button"
                variant={rejectVariant}
                fullWidth
                disabled={disabled}
                loading={pending === 'reject'}
                onClick={() => requestConfirm('reject')}
              >
                {labels.reject}
              </Button>
            </>
          )}
          {viewerIsProposer && (
            <Button
              type="button"
              variant="destructive"
              fullWidth
              disabled={disabled}
              loading={pending === 'withdraw'}
              onClick={() => requestConfirm('withdraw')}
            >
              {labels.withdraw}
            </Button>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={confirm === 'accept'}
        title={labels.acceptConfirm.title}
        message={labels.acceptConfirm.message}
        confirmText={labels.acceptConfirm.confirmText}
        cancelText={labels.cancel}
        confirmVariant="primary"
        onConfirm={() => run('accept')}
        onCancel={cancelConfirm}
      />

      <ConfirmationModal
        isOpen={confirm === 'reject'}
        title={labels.rejectConfirm.title}
        message={labels.rejectConfirm.message}
        confirmText={labels.rejectConfirm.confirmText}
        cancelText={labels.cancel}
        confirmVariant="danger"
        onConfirm={() => run('reject')}
        onCancel={cancelConfirm}
      />

      <ConfirmationModal
        isOpen={confirm === 'withdraw'}
        title={labels.withdrawConfirm.title}
        message={labels.withdrawConfirm.message}
        confirmText={labels.withdrawConfirm.confirmText}
        cancelText={labels.cancel}
        confirmVariant="danger"
        onConfirm={() => run('withdraw')}
        onCancel={cancelConfirm}
      />
    </>
  );
}
