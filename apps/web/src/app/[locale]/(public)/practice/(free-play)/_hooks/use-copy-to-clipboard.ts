'use client';

import { useCallback, useState } from 'react';

import { UI_TIMEOUTS } from '@/app/[locale]/_constants/ui-timeouts';

export type CopyStatus = 'idle' | 'success' | 'error' | 'too_long';

/**
 * Generic clipboard copy hook with status management.
 *
 * @param generateUrl - Called when `copy()` is invoked. Must return
 *   `{ url, isTooLong }` or `null` to abort.
 */
export function useCopyToClipboard(generateUrl: () => { url: string; isTooLong: boolean } | null): {
  copyStatus: CopyStatus;
  copy: () => void;
} {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  const copy = useCallback(() => {
    const result = generateUrl();
    if (!result) return;

    const { url, isTooLong } = result;

    if (isTooLong) {
      setCopyStatus('too_long');
      setTimeout(() => setCopyStatus('idle'), UI_TIMEOUTS.COPY_SUCCESS_DURATION);
      return;
    }

    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopyStatus('success');
        setTimeout(() => setCopyStatus('idle'), UI_TIMEOUTS.COPY_SUCCESS_DURATION);
      })
      .catch(() => {
        setCopyStatus('error');
        setTimeout(() => setCopyStatus('idle'), UI_TIMEOUTS.COPY_SUCCESS_DURATION);
      });
  }, [generateUrl]);

  return { copyStatus, copy };
}
