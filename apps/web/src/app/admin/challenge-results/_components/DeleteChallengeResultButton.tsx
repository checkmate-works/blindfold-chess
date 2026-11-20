'use client';

import { useRef } from 'react';

import { Textarea } from '@/app/_components';
import { useConfirmModalAction } from '@/app/admin/_hooks/useConfirmModalAction';

import { MODERATION_REASON_MAX_LENGTH } from '@/lib/moderation/validate-reason';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { deleteChallengeResult } from '../_actions/deleteChallengeResult';

/**
 * Removes one challenge result after the admin names the result and gives a
 * reason.
 *
 * The modal restates which result is about to go (`labels.target`) and what
 * removing it does (`labels.description`), because the effect reaches past
 * the row: the score leaves the rankings and the player's best, and its Exp is
 * taken back. An empty reason is caught here; the action checks it again.
 *
 * There is no `router.refresh()`: the action revalidates the list, which
 * drops the row's button and shows it as removed.
 */
export function DeleteChallengeResultButton({
  resultId,
  labels,
}: {
  resultId: string;
  labels: {
    button: string;
    title: string;
    /** The result being removed: player, menu, key and score, already formatted. */
    target: string;
    /** What the removal changes and what it keeps. */
    description: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    cancel: string;
    confirm: string;
    reasonRequired: string;
  };
}) {
  const { isOpen, open, cancel, isPending, error, setError, run } = useConfirmModalAction();
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  async function handleDelete() {
    const reason = reasonRef.current?.value.trim();
    if (!reason) {
      setError(labels.reasonRequired);
      return;
    }

    await run(() => deleteChallengeResult(resultId, reason));
  }

  const reasonId = `delete-challenge-result-reason-${resultId}`;

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="px-3 py-1 text-xs font-medium rounded bg-destructive text-destructive-foreground hover:opacity-80 transition-opacity"
      >
        {labels.button}
      </button>

      <ConfirmationModal
        isOpen={isOpen}
        title={labels.title}
        confirmText={labels.confirm}
        cancelText={labels.cancel}
        confirmVariant="danger"
        isLoading={isPending}
        error={error}
        onConfirm={handleDelete}
        onCancel={cancel}
      >
        <p className="text-sm font-medium mb-1">{labels.target}</p>
        <p className="text-sm text-muted-foreground mb-4">{labels.description}</p>
        <label htmlFor={reasonId} className="block text-sm font-medium mb-2">
          {labels.reasonLabel}
        </label>
        <Textarea
          id={reasonId}
          ref={reasonRef}
          inputSize="sm"
          rows={3}
          maxLength={MODERATION_REASON_MAX_LENGTH}
          placeholder={labels.reasonPlaceholder}
        />
      </ConfirmationModal>
    </>
  );
}
