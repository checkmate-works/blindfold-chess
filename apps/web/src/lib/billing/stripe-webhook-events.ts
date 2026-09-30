import { eq } from 'drizzle-orm';
import 'server-only';
import type Stripe from 'stripe';

import { db, stripeWebhookEvents } from '@/lib/db';

/**
 * True when the webhook route has already finished processing this event.
 *
 * Stripe delivers an event at least once: a delivery whose response was slow
 * or lost is re-sent with the same `event.id`. The route asks this before
 * dispatching so a redelivery is acknowledged from a primary-key lookup
 * instead of re-running the handler (a Stripe API call, a write and a cache
 * invalidation).
 */
export async function hasProcessedWebhookEvent(eventId: string): Promise<boolean> {
  const rows = await db
    .select({ eventId: stripeWebhookEvents.eventId })
    .from(stripeWebhookEvents)
    .where(eq(stripeWebhookEvents.eventId, eventId))
    .limit(1);
  return rows.length > 0;
}

/**
 * Record that an event's handler has succeeded.
 *
 * Called after the handler, never before: a row written on arrival would
 * survive a handler failure and make the retry Stripe sends for the 500 look
 * like a duplicate. Two deliveries of one event that overlap in flight can
 * therefore both reach this insert; the conflict is ignored because both
 * handlers wrote the same current state (see the `stripe_webhook_events`
 * table's TSDoc).
 */
export async function recordProcessedWebhookEvent(
  event: Pick<Stripe.Event, 'id' | 'type' | 'created'>
): Promise<void> {
  await db
    .insert(stripeWebhookEvents)
    .values({
      eventId: event.id,
      eventType: event.type,
      eventCreatedAt: new Date(event.created * 1000),
    })
    .onConflictDoNothing({ target: stripeWebhookEvents.eventId });
}
