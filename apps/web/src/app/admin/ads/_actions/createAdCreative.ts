'use server';

import { eq, sql } from 'drizzle-orm';

import { kindForSlot } from '@/lib/ads/registry';
import type { AdSlot } from '@/lib/ads/registry';
import { adCreatives, db } from '@/lib/db';

import { adminMutationGuard } from '../../_lib/action-factories';
import { revalidateAdCreatives } from '../_lib/revalidate';
import type { CreateAdCreativeData } from '../_lib/validation';
import { validateCreateAdCreative } from '../_lib/validation';

type CreateResult = { success: true; id: string } | { error: string };

export async function createAdCreative(data: CreateAdCreativeData): Promise<CreateResult> {
  const guardError = await adminMutationGuard(data, validateCreateAdCreative);
  if (guardError) {
    return guardError;
  }

  try {
    // Append to the end of the slot's list; order is managed by drag-and-drop
    // on the slot page thereafter.
    const [{ nextOrder }] = await db
      .select({
        nextOrder: sql<number>`coalesce(max(${adCreatives.sortOrder}), -1) + 1`,
      })
      .from(adCreatives)
      .where(eq(adCreatives.slot, data.slot));

    const [inserted] = await db
      .insert(adCreatives)
      .values({
        kind: kindForSlot(data.slot as AdSlot),
        slot: data.slot,
        href: data.href,
        isActive: data.isActive,
        sortOrder: nextOrder,
        targetCountry: data.targetCountry,
        payload: data.payload,
      })
      .returning({ id: adCreatives.id });

    revalidateAdCreatives();
    return { success: true, id: inserted.id };
  } catch {
    return { error: 'Failed to create ad creative' };
  }
}
