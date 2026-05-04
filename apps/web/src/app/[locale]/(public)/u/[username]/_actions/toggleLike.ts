'use server';

import type { ToggleLikeResult } from '@/lib/positions/like-actions';
import { togglePositionLike } from '@/lib/positions/like-actions';

export async function toggleLike(positionId: string, locale: string): Promise<ToggleLikeResult> {
  return togglePositionLike(positionId, locale);
}
