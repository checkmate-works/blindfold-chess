'use client';

import { type ReactNode, useEffect, useId, useState } from 'react';

import { createPortal } from 'react-dom';

import { useFocusTrap } from '../_hooks/use-focus-trap';
import { useScrollLock } from '../_hooks/use-scroll-lock';
import { CloseButton } from './CloseButton';

type Props = {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
  /**
   * When true, traps Tab focus inside the dialog while open and restores
   * focus to the previously-focused element on close. Defaults to false
   * to keep existing call sites unchanged.
   */
  trapFocus?: boolean;
  /**
   * When true, the dialog fills the viewport on screens narrower than
   * `sm` (640px). On `sm`+ the layout falls back to the default centered
   * card. Defaults to false to keep existing call sites unchanged.
   */
  fullHeightOnMobile?: boolean;
  /**
   * When true, the portal stays mounted while `isOpen=false` (the
   * children's React state and DOM are preserved across open/close
   * cycles). The container is hidden via `display: none` and
   * `aria-hidden` so the closed state is fully invisible / inert.
   *
   * Defaults to false to keep existing call sites unchanged — they
   * unmount on close as before.
   *
   * Use case: AttachmentModal preserves the user's in-progress draft
   * (PGN textarea, FEN input, image picker, video URL, anonymize
   * checkbox) across open/close cycles so accidental closes do not
   * lose work.
   */
  keepMounted?: boolean;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
};

export function Modal({
  isOpen,
  title,
  onClose,
  children,
  maxWidth = 'max-w-2xl',
  trapFocus = false,
  fullHeightOnMobile = false,
  keepMounted = false,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: Props) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen && trapFocus);

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

  if (!mounted) return null;
  if (!isOpen && !keepMounted) return null;

  // Tailwind 4 scans source files for literal class names; a dynamic
  // `sm:${maxWidth}` would not be detected. The `fullHeightOnMobile`
  // path therefore hardcodes `sm:max-w-2xl` (the value used by the only
  // current opt-in caller, AttachmentModal). If a future caller needs a
  // different sm: width, add a literal here so JIT can detect it.
  const dialogClassName = fullHeightOnMobile
    ? 'bg-card flex flex-col w-full h-full max-h-screen overflow-hidden sm:h-auto sm:max-h-[90vh] sm:rounded-lg sm:max-w-2xl sm:overflow-y-auto'
    : `bg-card rounded-lg w-full ${maxWidth} max-h-[90vh] overflow-y-auto`;

  const containerClassName = fullHeightOnMobile
    ? 'fixed inset-0 flex z-50 sm:items-center sm:justify-center sm:p-4'
    : 'fixed inset-0 flex items-center justify-center z-50 p-4';

  // When keepMounted is true and isOpen is false, hide the portal root
  // so the children stay mounted (preserving their React state and DOM)
  // but are visually absent and inert. `display: none` is the cheapest
  // way to do this — focus / pointer events / a11y all skip it.
  const hiddenWrapperClass = !isOpen && keepMounted ? 'hidden' : '';

  // Portal content is wrapped in a div with stopPropagation to prevent React synthetic
  // events from bubbling through the component tree to parent elements (e.g., Link).
  return createPortal(
    <div
      className={hiddenWrapperClass}
      aria-hidden={!isOpen ? 'true' : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop + Modal container: clicking the overlay area closes the modal */}
      <div className="fixed inset-0 bg-black/50 z-40" aria-hidden="true" />
      <div className={containerClassName} onClick={onClose}>
        <div
          ref={trapRef}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          className={dialogClassName}
          role="dialog"
          aria-modal="true"
          data-app-modal="true"
          aria-labelledby={title ? titleId : ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
        >
          {/* Header */}
          {title && (
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 id={titleId} className="text-xl font-semibold text-foreground">
                {title}
              </h2>
              <CloseButton onClick={onClose} />
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
