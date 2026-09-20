'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import type { AdSlot } from '@/lib/ads/registry';

import { createAdCreative } from '../_actions/createAdCreative';
import { updateAdCreative } from '../_actions/updateAdCreative';
import type { AdCreativeFields } from './validation';

/**
 * Shared create/update + redirect for the per-kind creative forms. On create,
 * routes to the new creative's edit page (so an image can be uploaded next —
 * the upload needs a creative id to file the object under); on update, back
 * to the slot's creative list.
 */
export function useCreativeSubmit(slot: AdSlot) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (
    mode: 'create' | 'edit',
    creativeId: string | undefined,
    fields: AdCreativeFields
  ) => {
    setError(null);
    startTransition(async () => {
      if (mode === 'create') {
        const result = await createAdCreative({ slot, ...fields });
        if ('error' in result) setError(result.error);
        else router.push(`/admin/ads/${slot}/${result.id}/edit`);
      } else if (creativeId) {
        const result = await updateAdCreative(creativeId, fields);
        if ('error' in result) setError(result.error);
        else router.push(`/admin/ads/${slot}`);
      }
    });
  };

  return { submit, isPending, error, setError };
}
