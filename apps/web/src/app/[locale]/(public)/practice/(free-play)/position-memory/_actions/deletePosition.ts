'use server';

import { revalidatePath } from 'next/cache';

import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';
import { and, eq, isNull } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { db, positions } from '@/lib/db';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

export async function deletePosition(positionId: string, locale: string): Promise<ActionResult> {
  assertSupportedLocale(locale);

  const guardResult = await authenticateAndGuard(RATE_LIMITS.deletePosition);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const [position] = await db
    .select({
      id: positions.id,
      userId: positions.userId,
      deletedAt: positions.deletedAt,
    })
    .from(positions)
    .where(eq(positions.id, positionId))
    .limit(1);

  if (!position) {
    return { error: 'notFound' };
  }

  if (position.userId !== user.id) {
    return { error: 'unauthorized' };
  }

  if (position.deletedAt) {
    return { error: 'alreadyDeleted' };
  }

  await db
    .update(positions)
    .set({ deletedAt: new Date() })
    .where(and(eq(positions.id, positionId), isNull(positions.deletedAt)));

  revalidatePath(`/${locale}/practice/position-memory`);
  revalidatePath(`/${locale}/practice/position-memory/${positionId}`);

  return { success: true };
}
