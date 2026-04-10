'use server';

import { type ToggleLikeResult, togglePositionLike } from '@/lib/positions/like-actions';

export type { ToggleLikeResult };

export async function toggleLike(positionId: string, locale: string): Promise<ToggleLikeResult> {
  return togglePositionLike(positionId, locale);
}
