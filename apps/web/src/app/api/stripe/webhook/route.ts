import { NextResponse } from 'next/server';

import type Stripe from 'stripe';

import { getStripe, getStripeWebhookSecret } from '@/lib/billing/stripe';
import {
  hasProcessedWebhookEvent,
  recordProcessedWebhookEvent,
} from '@/lib/billing/stripe-webhook-events';
import {
  handleCheckoutCompleted,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from '@/lib/billing/stripe-webhook-handlers';
import { captureError } from '@/lib/sentry/capture-error';

/**
 * Stripe webhook endpoint.
 *
 * Every response code here is a message to Stripe's retry logic, so the
 * mapping is deliberate:
 *
 * - `400` for a request that will never verify (missing or bad signature).
 *   Stripe does not retry these.
 * - `500` when a handler throws. Stripe redelivers the event with backoff for
 *   up to three days, which is the right call for a transient failure (the
 *   database, the Stripe API); handlers therefore reserve `throw` for those
 *   and acknowledge unrecoverable data problems with a Sentry report instead.
 * - `200` once the event has been handled, or when it was handled by an
 *   earlier delivery. Stripe delivers at least once, so a redelivery of an
 *   event already recorded in `stripe_webhook_events` is acknowledged without
 *   re-running its handler. The record is written after the handler
 *   succeeds, so a failed handler is retried rather than remembered.
 *
 * Failing to write that record after a successful handler is reported but
 * still answered `200`: the event was processed, and the retry a `500` would
 * trigger only re-runs an idempotent handler.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, sig, getStripeWebhookSecret());
  } catch (err) {
    captureError(err, '[stripe/webhook] signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let handled = true;
  try {
    if (await hasProcessedWebhookEvent(event.id)) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        handled = false;
        break;
    }
  } catch (error) {
    captureError(error, `[stripe/webhook] handler failed for ${event.type}`);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  if (handled) {
    try {
      await recordProcessedWebhookEvent(event);
    } catch (error) {
      captureError(error, `[stripe/webhook] failed to record processed event ${event.id}`);
    }
  }

  return NextResponse.json({ received: true });
}
