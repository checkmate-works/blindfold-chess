'use client';

import { type ReactNode, useEffect, useId } from 'react';

import { FaTimes } from 'react-icons/fa';

import { useScrollLock } from '@/app/[locale]/_hooks/useScrollLock';

type InfoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function InfoModal({ isOpen, onClose, title, children }: InfoModalProps) {
  const titleId = useId();

  useScrollLock(isOpen);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 id={titleId} className="text-xl font-bold text-foreground">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Close"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>
        <div className="text-foreground">{children}</div>
      </div>
    </div>
  );
}
