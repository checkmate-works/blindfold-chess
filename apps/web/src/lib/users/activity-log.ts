import 'server-only';

import { db, userActivityLog } from '../db';
import { captureError } from '../sentry/capture-error';

type ActivityEvent = {
  userId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Record a user activity event. Fire-and-forget — a failed insert never
 * breaks the main action, but it is still reported via {@link captureError}.
 * This table is the only source of the admin Activity Log, so a failure that
 * is dropped silently (a schema drift or an RLS change on
 * `user_activity_log`) would empty that page with nothing alerting anyone.
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
    .catch((error: unknown) => {
      captureError(error, `[logActivityEvent] failed to record ${event.action}`);
    });
}
