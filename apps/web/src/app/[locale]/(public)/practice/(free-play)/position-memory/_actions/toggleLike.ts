'use server';

import { type ToggleLikeResult, togglePositionLike } from '@/lib/positions/like-actions';

// Type-only re-exports are safe in `'use server'` files — TypeScript erases
// types at build time so they are not treated as Server Action exports.
export type { ToggleLikeResult };

export async function toggleLike(positionId: string, locale: string): Promise<ToggleLikeResult> {
  return togglePositionLike(positionId, locale);
}
