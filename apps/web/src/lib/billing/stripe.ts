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

function lazyEnv(envVarName: string): () => string {
  let cached: string | null = null;
  return () => {
    if (!cached) {
      const value = process.env[envVarName];
      if (!value) {
        throw new Error(`${envVarName} is not set`);
      }
      cached = value;
    }
    return cached;
  };
}

export const getStripePriceId: () => string = lazyEnv('STRIPE_PRICE_ID');

export const getStripeWebhookSecret: () => string = lazyEnv('STRIPE_WEBHOOK_SECRET');
