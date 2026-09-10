'use client';

import { type ReactNode, useId } from 'react';

import { Button } from '@/app/_components';

import { Modal } from './Modal';

type Props = {
  isOpen: boolean;
  title: string;
  message?: string;
  children?: ReactNode;
  error?: string | null;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  isLoading?: boolean;
  /** Keep keyboard focus inside the dialog while open. Opt-in, as on `Modal`. */
  trapFocus?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmationModal({
  isOpen,
  title,
  message,
  children,
  error,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  isLoading = false,
  trapFocus = false,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const messageId = useId();

  const getConfirmVariant = (): 'primary' | 'destructive' => {
    switch (confirmVariant) {
      case 'danger':
        return 'destructive';
      case 'primary':
      default:
        return 'primary';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      maxWidth="max-w-md"
      trapFocus={trapFocus}
      aria-labelledby={titleId}
      aria-describedby={message ? messageId : undefined}
    >
      {/* Header */}
      <div className="mb-4">
        <h2 id={titleId} className="text-xl font-bold text-foreground">
          {title}
        </h2>
      </div>

      {/* Content */}
      <div className="mb-6">
        {message && (
          <p id={messageId} className="text-muted-foreground leading-relaxed">
            {message}
          </p>
        )}
        {children}
        {error && <p className="text-destructive text-sm mt-2">{error}</p>}
      </div>

      {/*
        Actions. Stacked on phones, right-aligned in a row from `sm` up — a
        fixed row overflows once labels are long (a translated "Cancel" plus a
        verb-phrase confirm), and the buttons are easier to hit full-width.
        `flex-col-reverse` keeps the confirm above cancel while leaving the
        confirm last in DOM order, so tab order and screen readers still reach
        cancel first.

        `min-h-11` raises the phone tap target to 44px: the default `sm` button
        padding leaves these at 36px, which is below the 44px both platform
        guidelines ask for, and it read as too short next to the 48px submit
        button and the 44px coordinate keys on the practice sessions this
        dialog opens over. It also evens out the 2px the `secondary` cancel
        gains from its border. Released from `sm` up, where a pointer is
        driving and the row would otherwise grow for no one's benefit — the
        same shape the coordinate keypad uses (`h-11 sm:h-9`).
      */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          variant="secondary"
          className="min-h-11 sm:min-h-0"
        >
          {cancelText}
        </Button>

        <Button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          loading={isLoading}
          variant={getConfirmVariant()}
          className="min-h-11 sm:min-h-0"
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
