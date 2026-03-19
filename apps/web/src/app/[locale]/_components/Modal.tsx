'use client';

import { type ReactNode, useEffect, useId, useState } from 'react';

import { createPortal } from 'react-dom';

import { useScrollLock } from '../_hooks/use-scroll-lock';

type Props = {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
};

export function Modal({
  isOpen,
  title,
  onClose,
  children,
  maxWidth = 'max-w-2xl',
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: Props) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useScrollLock(isOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!isOpen || !mounted) return null;

  // Portal content is wrapped in a div with stopPropagation to prevent React synthetic
  // events from bubbling through the component tree to parent elements (e.g., Link).
  return createPortal(
    <div onClick={(e) => e.stopPropagation()}>
      {/* Backdrop + Modal container: clicking the overlay area closes the modal */}
      <div className="fixed inset-0 bg-black/50 z-40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div
          onClick={(e) => e.stopPropagation()}
          className={`bg-card rounded-lg shadow-xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
        >
          {/* Header */}
          {title && (
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 id={titleId} className="text-xl font-semibold text-foreground">
                {title}
              </h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Content */}
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
