import 'server-only';
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    });
  }
  return _stripe;
}

let _stripePriceId: string | null = null;

export function getStripePriceId(): string {
  if (!_stripePriceId) {
    if (!process.env.STRIPE_PRICE_ID) {
      throw new Error('STRIPE_PRICE_ID is not set');
    }
    _stripePriceId = process.env.STRIPE_PRICE_ID;
  }
  return _stripePriceId;
}

let _stripeWebhookSecret: string | null = null;

export function getStripeWebhookSecret(): string {
  if (!_stripeWebhookSecret) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    }
    _stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  }
  return _stripeWebhookSecret;
}
