'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Result = {
  /** True for `resetDelayMs` after a successful copy — drives "Copied!" UI. */
  copied: boolean;
  /** Write `text` to the clipboard and flip `copied` true, then back to false. */
  copy: (text: string) => void;
};

/**
 * Copy-to-clipboard with a transient "copied" flag. Replaces the repeated
 * `writeText().then(() => { setFlag(true); setTimeout(() => setFlag(false), N) })`
 * pattern. The reset timer is cleared on a fresh copy and on unmount so the
 * flag never resets against a stale timer or after the component is gone.
 */
export function useCopyToClipboard(resetDelayMs: number): Result {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const copy = useCallback(
    (text: string) => {
      void navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), resetDelayMs);
      });
    },
    [resetDelayMs]
  );

  return { copied, copy };
}
