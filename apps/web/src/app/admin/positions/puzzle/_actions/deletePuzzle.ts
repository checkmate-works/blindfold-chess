'use server';

import { revalidateTag } from 'next/cache';

import type { DeleteResult } from '@/app/admin/_lib/action-factories';

import { DAILY_PUZZLE_CACHE_TAG } from '@/lib/cache-tags';

import { softDeletePosition } from '../../_lib/soft-delete-position';

export async function deletePuzzle(id: string): Promise<DeleteResult> {
  const result = await softDeletePosition(id, {
    revalidatePaths: ['/admin/positions/puzzle'],
  });

  // A featured puzzle must leave the Daily Puzzle card immediately, not at
  // the hourly revalidate. Cheap enough to skip checking pool membership.
  if ('success' in result) {
    revalidateTag(DAILY_PUZZLE_CACHE_TAG, { expire: 0 });
  }

  return result;
}
