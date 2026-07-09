'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import type { BannerPayload, NativeCardPayload } from '@/lib/ads/payload';
import type { AdSlot } from '@/lib/ads/registry';

import { createAdCreative } from '../_actions/createAdCreative';
import { updateAdCreative } from '../_actions/updateAdCreative';
import type { CommonCreativeValues } from './use-common-creative-state';

/**
 * Shared create/update + redirect for the per-kind creative forms. On create,
 * routes to the new creative's edit page (so a native card's avatar can be
 * uploaded next); on update, back to the slot's creative list.
 */
export function useCreativeSubmit(slot: AdSlot) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (
    mode: 'create' | 'edit',
    creativeId: string | undefined,
    common: CommonCreativeValues,
    payload: BannerPayload | NativeCardPayload
  ) => {
    setError(null);
    startTransition(async () => {
      if (mode === 'create') {
        const result = await createAdCreative({ slot, ...common, payload });
        if ('error' in result) setError(result.error);
        else router.push(`/admin/ads/${slot}/${result.id}/edit`);
      } else if (creativeId) {
        const result = await updateAdCreative(creativeId, { ...common, payload });
        if ('error' in result) setError(result.error);
        else router.push(`/admin/ads/${slot}`);
      }
    });
  };

  return { submit, isPending, error, setError };
}
