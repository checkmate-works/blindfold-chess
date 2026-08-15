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
      */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" onClick={onCancel} disabled={isLoading} variant="secondary">
          {cancelText}
        </Button>

        <Button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          loading={isLoading}
          variant={getConfirmVariant()}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
