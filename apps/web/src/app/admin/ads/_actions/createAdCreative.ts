'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { AD_CREATIVES_CACHE_TAG } from '@/lib/ads/ad';
import { kindForSlot } from '@/lib/ads/registry';
import type { AdSlot } from '@/lib/ads/registry';
import { adCreatives, db } from '@/lib/db';

import { adminMutationGuard } from '../../_lib/action-factories';
import type { CreateAdCreativeData } from '../_lib/validation';
import { validateCreateAdCreative } from '../_lib/validation';

type CreateResult = { success: true; id: string } | { error: string };

export async function createAdCreative(data: CreateAdCreativeData): Promise<CreateResult> {
  const guardError = await adminMutationGuard(data, validateCreateAdCreative);
  if (guardError) {
    return guardError;
  }

  try {
    const [inserted] = await db
      .insert(adCreatives)
      .values({
        kind: kindForSlot(data.slot as AdSlot),
        slot: data.slot,
        href: data.href,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        startAt: data.startAt ? new Date(data.startAt) : null,
        endAt: data.endAt ? new Date(data.endAt) : null,
        targetCountry: data.targetCountry,
        payload: data.payload,
      })
      .returning({ id: adCreatives.id });

    revalidatePath('/admin/ads');
    revalidateTag(AD_CREATIVES_CACHE_TAG, { expire: 60 });
    return { success: true, id: inserted.id };
  } catch {
    return { error: 'Failed to create ad creative' };
  }
}
