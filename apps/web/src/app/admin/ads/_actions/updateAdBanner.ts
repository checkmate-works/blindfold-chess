'use server';

import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { adBanners, db } from '@/lib/db';

import { adminMutationGuard } from '../../_lib/action-factories';
import type { UpdateAdBannerData } from '../_lib/validation';
import { validateUpdateAdBanner } from '../_lib/validation';

export async function updateAdBanner(id: string, data: UpdateAdBannerData): Promise<ActionResult> {
  const guardError = await adminMutationGuard(data, validateUpdateAdBanner);
  if (guardError) {
    return guardError;
  }

  await db
    .update(adBanners)
    .set({
      href: data.href,
      imagePath: data.imagePath,
      alt: data.alt,
      isActive: data.isActive,
      updatedAt: new Date(),
    })
    .where(eq(adBanners.id, id));

  return { success: true };
}
