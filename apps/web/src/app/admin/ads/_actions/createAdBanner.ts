'use server';

import { revalidatePath, updateTag } from 'next/cache';

import { adBanners, db } from '@/lib/db';

import { requireAdmin } from '../../_lib/auth';

type CreateData = {
  slot: string;
  href: string;
  imagePath: string;
  alt: string;
  width: number;
  height: number;
  isActive: boolean;
  sortOrder: number;
  startAt: string | null;
  endAt: string | null;
};

type CreateResult = { success: true; id: string } | { error: string };

export async function createAdBanner(data: CreateData): Promise<CreateResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  if (!data.slot || data.slot.length > 50) {
    return { error: 'invalid slot' };
  }

  if (!data.href || data.href.length > 2048) {
    return { error: 'invalid href' };
  }

  if (!data.imagePath || data.imagePath.length > 1024) {
    return { error: 'invalid imagePath' };
  }

  if (!data.width || data.width <= 0) {
    return { error: 'invalid width' };
  }

  if (!data.height || data.height <= 0) {
    return { error: 'invalid height' };
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

    // updateTag invalidates the unstable_cache-wrapped data; revalidatePath
    // evicts ISR-rendered HTML that has the ad markup baked in.
    updateTag('ads-config');
    revalidatePath('/', 'layout');

    return { success: true, id: inserted.id };
  } catch (error) {
    if (error instanceof Error && error.message.includes('unique')) {
      return { error: 'A banner with this slot already exists' };
    }
    return { error: 'Failed to create ad banner' };
  }
}
