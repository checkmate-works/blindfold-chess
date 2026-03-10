import 'server-only';

import { db, userActivityLog } from './db';

type ActivityEvent = {
  userId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Record a user activity event. Fire-and-forget — failures are silently
 * caught so that activity logging never breaks the main action.
 */
export function logActivityEvent(event: ActivityEvent): void {
  db.insert(userActivityLog)
    .values({
      userId: event.userId,
      action: event.action,
      targetType: event.targetType ?? null,
      targetId: event.targetId ?? null,
      metadata: event.metadata ?? {},
    })
    .then(() => {})
    .catch(() => {});
}
