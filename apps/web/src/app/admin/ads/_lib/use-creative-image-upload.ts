'use client';

import { useState } from 'react';

export type CreativeImageTarget = 'avatar' | 'thumbnail';

async function errorFromResponse(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error ?? fallback;
}

/**
 * Client for `/api/admin/ads/[id]/image`: upload or remove a native-card
 * creative's avatar / thumbnail-override image, with per-target busy state so
 * the two upload widgets stay independent. `onError` feeds the form's shared
 * error banner (`useCreativeSubmit`'s `setError`); it is cleared on every new
 * attempt. With no `creativeId` yet (create mode) the API is never called:
 * `upload` no-ops and `remove` reports success so the caller just drops its
 * local state.
 */
export function useCreativeImageUpload(
  creativeId: string | undefined,
  onError: (message: string | null) => void
) {
  const [busy, setBusy] = useState<Record<CreativeImageTarget, boolean>>({
    avatar: false,
    thumbnail: false,
  });

  const setTargetBusy = (target: CreativeImageTarget, value: boolean) =>
    setBusy((prev) => ({ ...prev, [target]: value }));

  const upload = async (target: CreativeImageTarget, file: File): Promise<string | null> => {
    if (!creativeId) return null;
    onError(null);
    setTargetBusy(target, true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('target', target);
      const res = await fetch(`/api/admin/ads/${creativeId}/image`, { method: 'POST', body });
      if (!res.ok) {
        onError(await errorFromResponse(res, 'upload_failed'));
        return null;
      }
      const data = (await res.json()) as { imagePath: string };
      return data.imagePath;
    } finally {
      setTargetBusy(target, false);
    }
  };

  const remove = async (target: CreativeImageTarget): Promise<boolean> => {
    if (!creativeId) return true;
    onError(null);
    setTargetBusy(target, true);
    try {
      const res = await fetch(`/api/admin/ads/${creativeId}/image?target=${target}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        onError(await errorFromResponse(res, 'delete_failed'));
        return false;
      }
      return true;
    } finally {
      setTargetBusy(target, false);
    }
  };

  const isBusy = (target: CreativeImageTarget) => busy[target];

  return { upload, remove, isBusy };
}
