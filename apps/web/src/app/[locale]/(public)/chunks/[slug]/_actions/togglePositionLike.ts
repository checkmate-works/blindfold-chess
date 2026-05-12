'use server';

import type { ToggleLikeResult } from '@/lib/positions/like-actions';
import { togglePositionLike as togglePositionLikeBase } from '@/lib/positions/like-actions';

export async function togglePositionLike(
  positionId: string,
  locale: string
): Promise<ToggleLikeResult> {
  return togglePositionLikeBase(positionId, locale);
}
