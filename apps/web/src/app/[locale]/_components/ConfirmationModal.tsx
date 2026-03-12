'use client';

import { type ReactNode, useId } from 'react';

import { Button } from '@/app/_components';

import { Modal } from './Modal';

type Props = {
  isOpen: boolean;
  title: string;
  message: string;
  children?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'warning';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmationModal({
  isOpen,
  title,
  message,
  children,
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
      case 'warning':
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
      aria-describedby={messageId}
    >
      {/* Header */}
      <div className="mb-4">
        <h2 id={titleId} className="text-xl font-bold text-foreground">
          {title}
        </h2>
      </div>

      {/* Content */}
      <div className="mb-6">
        <p id={messageId} className="text-muted-foreground leading-relaxed">
          {message}
        </p>
        {children}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
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
