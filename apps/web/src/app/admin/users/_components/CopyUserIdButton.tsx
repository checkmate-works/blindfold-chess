'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { FaCheck, FaRegCopy } from 'react-icons/fa';

import { UI_TIMEOUTS } from '@/app/[locale]/_constants/ui-timeouts';

type CopyUserIdButtonProps = {
  userId: string;
  labels: {
    copyUserId: string;
    copyUserIdSuccess: string;
  };
  /**
   * Injected clipboard writer — defaults to `navigator.clipboard.writeText`.
   * Exposed for unit testing without mocking globals.
   */
  writeToClipboard?: (text: string) => Promise<void>;
};

/**
 * Icon-only button that copies a user UUID to the clipboard.
 *
 * On success the icon briefly swaps to a check mark for visual feedback
 * (there is no shared toast component in apps/web at the time of writing).
 *
 * Scoped to `admin/users` on purpose — do not lift this into a shared
 * component without an actual second use case.
 */
export function CopyUserIdButton({ userId, labels, writeToClipboard }: CopyUserIdButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    const write = writeToClipboard ?? ((text: string) => navigator.clipboard.writeText(text));
    try {
      await write(userId);
      setIsCopied(true);
      // Reset any pending revert timer so rapid clicks start a fresh window.
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setIsCopied(false);
        timerRef.current = null;
      }, UI_TIMEOUTS.PGN_COPY_DURATION);
    } catch {
      // Swallow — secure context is assumed per requirements; if writeText
      // rejects we simply do not flip to the success state.
    }
  }, [userId, writeToClipboard]);

  const label = isCopied ? labels.copyUserIdSuccess : labels.copyUserId;

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {isCopied ? (
        <FaCheck className="h-3 w-3 text-success-soft-foreground" aria-hidden="true" />
      ) : (
        <FaRegCopy className="h-3 w-3" aria-hidden="true" />
      )}
    </button>
  );
}
