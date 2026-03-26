'use client';

import { type ReactNode, useCallback, useState } from 'react';

import { ConfirmationModal } from './ConfirmationModal';

type Props = {
  /** The trigger element that opens the modal */
  trigger: ReactNode;
  /** Modal title */
  title: string;
  /** Modal message/description */
  message: string;
  /** Label for the confirm button */
  confirmLabel?: string;
  /** Label shown while the action is pending */
  pendingLabel?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
  /** Visual style of the confirm button */
  confirmVariant?: 'primary' | 'danger' | 'warning';
  /** Async action to execute on confirm. Return `{ error: string }` to show an error. */
  onConfirm: () => Promise<{ error: string } | void>;
  /** Called after a successful action completes */
  onSuccess?: () => void;
  /** Extra content rendered between the message and action buttons (e.g., a reason textarea) */
  children?: ReactNode;
};

export function ConfirmActionButton({
  trigger,
  title,
  message,
  confirmLabel = 'Confirm',
  pendingLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onSuccess,
  children,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    setIsPending(true);
    setError(null);

    const result = await onConfirm();

    if (result && 'error' in result) {
      setError(result.error);
      setIsPending(false);
    } else {
      setIsOpen(false);
      setIsPending(false);
      onSuccess?.();
    }
  }, [onConfirm, onSuccess]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    setError(null);
  }, []);

  return (
    <>
      <span onClick={() => setIsOpen(true)} role="presentation">
        {trigger}
      </span>

      <ConfirmationModal
        isOpen={isOpen}
        title={title}
        message={message}
        confirmText={isPending && pendingLabel ? pendingLabel : confirmLabel}
        cancelText={cancelLabel}
        confirmVariant={confirmVariant}
        isLoading={isPending}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      >
        {children}
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </ConfirmationModal>
    </>
  );
}
