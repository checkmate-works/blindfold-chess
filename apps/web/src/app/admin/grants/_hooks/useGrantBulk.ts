'use client';

import { useState } from 'react';

import { createBulkGrants } from '../_actions/createBulkGrants';

type UseGrantBulkResult = {
  durationDays: number;
  reason: string;
  granting: boolean;
  error: string | null;
  setDurationDays: (v: number) => void;
  setReason: (v: string) => void;
  submit: (userIds: string[]) => Promise<{ grantedCount: number } | { error: string }>;
  clearError: () => void;
};

/**
 * Owns the grant-params state (duration and reason) and the bulk grant
 * submission flow.
 */
export function useGrantBulk(): UseGrantBulkResult {
  const [durationDays, setDurationDays] = useState(30);
  const [reason, setReason] = useState('');
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(userIds: string[]) {
    setGranting(true);
    setError(null);

    const result = await createBulkGrants({
      userIds,
      durationDays,
      reason,
    });

    setGranting(false);

    if ('error' in result) {
      setError(result.error);
      return { error: result.error };
    }

    return { grantedCount: result.grantedCount };
  }

  function clearError() {
    setError(null);
  }

  return {
    durationDays,
    reason,
    granting,
    error,
    setDurationDays,
    setReason,
    submit,
    clearError,
  };
}
