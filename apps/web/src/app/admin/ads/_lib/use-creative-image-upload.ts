'use client';

import { useState } from 'react';

import { readApiError } from '@/lib/http/read-api-error';

export type CreativeImageTarget = 'avatar' | 'thumbnail';

/**
 * Client for `/api/admin/ads/[id]/image`: upload or remove a creative's
 * avatar / thumbnail-override image, with per-target busy state so the two
 * upload widgets stay independent. `onError` feeds the form's shared error
 * banner (`useCreativeSubmit`'s `setError`); it is cleared on every new
 * attempt. With no `creativeId` yet (create mode) the API is never called:
 * `upload` no-ops and `remove` reports success so the caller just drops its
 * local state.
 *
 * `alt` travels with the file. The row stores an image and its alt as a pair,
 * so the route writes both at once; the alt the admin has typed so far is
 * what it should be, and the form re-saves it on submit if it changes.
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

  const upload = async (
    target: CreativeImageTarget,
    file: File,
    alt: string
  ): Promise<string | null> => {
    if (!creativeId) return null;
    onError(null);
    setTargetBusy(target, true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('target', target);
      body.append('alt', alt);
      const res = await fetch(`/api/admin/ads/${creativeId}/image`, { method: 'POST', body });
      if (!res.ok) {
        onError((await readApiError(res)) ?? 'upload_failed');
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
        onError((await readApiError(res)) ?? 'delete_failed');
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
