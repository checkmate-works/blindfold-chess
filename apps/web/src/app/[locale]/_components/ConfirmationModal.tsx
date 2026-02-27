'use client';

import { type ReactNode, useEffect, useId } from 'react';

import { Button } from '@/app/_components';

import { useScrollLock } from '../_hooks/useScrollLock';

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

  useScrollLock(isOpen);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} aria-hidden="true" />

      {/* Modal */}
      <div
        className="relative bg-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        role="dialog"
        aria-modal="true"
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
      </div>
    </div>
  );
}
