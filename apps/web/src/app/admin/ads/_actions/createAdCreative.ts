'use server';

import { eq, sql } from 'drizzle-orm';

import { copyToTranslationRows } from '@/lib/ads/copy';
import { kindForSlot } from '@/lib/ads/registry';
import type { AdSlot } from '@/lib/ads/registry';
import { adCreativeTranslations, adCreatives, db } from '@/lib/db';
import { handleAdminActionError } from '@/lib/server-action-error';

import { adminMutationGuard } from '../../_lib/action-factories';
import { toAdCreativeColumns } from '../_lib/creative-columns';
import { revalidateAdCreatives } from '../_lib/revalidate';
import type { CreateAdCreativeData } from '../_lib/validation';
import { validateCreateAdCreative } from '../_lib/validation';

type CreateResult = { success: true; id: string } | { error: string };

export async function createAdCreative(data: CreateAdCreativeData): Promise<CreateResult> {
  const guardError = await adminMutationGuard(data, validateCreateAdCreative);
  if (guardError) {
    return guardError;
  }

  const slot = data.slot as AdSlot;
  const columns = toAdCreativeColumns(kindForSlot(slot), data);

  try {
    // The row and its copy land together: a creative with no `en` row would
    // render a blank card, and the validator has already required one.
    const id = await db.transaction(async (tx) => {
      // Append to the end of the slot's list; order is managed by
      // drag-and-drop on the slot page thereafter.
      const [{ nextOrder }] = await tx
        .select({
          nextOrder: sql<number>`coalesce(max(${adCreatives.sortOrder}), -1) + 1`,
        })
        .from(adCreatives)
        .where(eq(adCreatives.slot, slot));

      const [inserted] = await tx
        .insert(adCreatives)
        .values({ slot, sortOrder: nextOrder, ...columns })
        .returning({ id: adCreatives.id });

      const copyRows = copyToTranslationRows(inserted.id, data);
      if (copyRows.length > 0) await tx.insert(adCreativeTranslations).values(copyRows);

      return inserted.id;
    });

    revalidateAdCreatives();
    return { success: true, id };
  } catch (error) {
    return handleAdminActionError(error, '[createAdCreative]', 'Failed to create ad creative');
  }
}
