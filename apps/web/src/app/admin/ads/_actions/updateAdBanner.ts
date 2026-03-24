'use server';

import { updateTag } from 'next/cache';

import { eq } from 'drizzle-orm';

import { adBanners, db } from '@/lib/db';

import { requireAdmin } from '../../_lib/auth';

type UpdateData = {
  href: string;
  imagePath: string;
  alt: string;
  isActive: boolean;
};

type UpdateResult = { success: true } | { error: string };

export async function updateAdBanner(id: string, data: UpdateData): Promise<UpdateResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  if (!data.href || data.href.length > 2048) {
    return { error: 'invalid href' };
  }

  if (!data.imagePath || data.imagePath.length > 1024) {
    return { error: 'invalid imagePath' };
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

  updateTag('ads-config');

  return { success: true };
}
