'use server';

import { adBanners, db } from '@/lib/db';
import { extractPgErrorCode } from '@/lib/db/extract-pg-error-code';

import { adminMutationGuard } from '../../_lib/action-factories';
import type { CreateAdBannerData } from '../_lib/validation';
import { validateCreateAdBanner } from '../_lib/validation';

type CreateResult = { success: true; id: string } | { error: string };

export async function createAdBanner(data: CreateAdBannerData): Promise<CreateResult> {
  const guardError = await adminMutationGuard(data, validateCreateAdBanner);
  if (guardError) {
    return guardError;
  }

  try {
    const [inserted] = await db
      .insert(adBanners)
      .values({
        slot: data.slot,
        href: data.href,
        imagePath: data.imagePath,
        alt: data.alt || 'Advertisement',
        width: data.width,
        height: data.height,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        startAt: data.startAt ? new Date(data.startAt) : null,
        endAt: data.endAt ? new Date(data.endAt) : null,
      })
      .returning({ id: adBanners.id });

    return { success: true, id: inserted.id };
  } catch (error) {
    if (extractPgErrorCode(error) === '23505') {
      return { error: 'A banner with this slot already exists' };
    }
    return { error: 'Failed to create ad banner' };
  }
}
