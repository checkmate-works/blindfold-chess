import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockConstructEvent = vi.fn();
const mockHasProcessed = vi.fn();
const mockRecordProcessed = vi.fn();
const mockCheckoutCompleted = vi.fn();
const mockSubscriptionUpdated = vi.fn();
const mockSubscriptionDeleted = vi.fn();
const mockCaptureError = vi.fn();

vi.mock('@/lib/billing/stripe', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: (...args: unknown[]) => mockConstructEvent(...args) },
  }),
  getStripeWebhookSecret: () => 'whsec_test',
}));

vi.mock('@/lib/billing/stripe-webhook-events', () => ({
  hasProcessedWebhookEvent: (...args: unknown[]) => mockHasProcessed(...args),
  recordProcessedWebhookEvent: (...args: unknown[]) => mockRecordProcessed(...args),
}));

vi.mock('@/lib/billing/stripe-webhook-handlers', () => ({
  handleCheckoutCompleted: (...args: unknown[]) => mockCheckoutCompleted(...args),
  handleSubscriptionUpdated: (...args: unknown[]) => mockSubscriptionUpdated(...args),
  handleSubscriptionDeleted: (...args: unknown[]) => mockSubscriptionDeleted(...args),
}));

vi.mock('@/lib/sentry/capture-error', () => ({
  captureError: (...args: unknown[]) => mockCaptureError(...args),
}));

const { POST } = await import('./route');

function makeEvent(type: string, object: Record<string, unknown> = {}): Stripe.Event {
  return {
    id: 'evt_1',
    type,
    created: 1700000000,
    data: { object },
  } as unknown as Stripe.Event;
}

function post(signature: string | null = 't=1,v1=sig'): Promise<Response> {
  const headers = new Headers();
  if (signature !== null) headers.set('stripe-signature', signature);
  return POST(
    new Request('https://example.com/api/stripe/webhook', { method: 'POST', headers, body: '{}' })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHasProcessed.mockResolvedValue(false);
  mockRecordProcessed.mockResolvedValue(undefined);
  mockCheckoutCompleted.mockResolvedValue(undefined);
  mockSubscriptionUpdated.mockResolvedValue(undefined);
  mockSubscriptionDeleted.mockResolvedValue(undefined);
});

describe('POST /api/stripe/webhook', () => {
  it('answers 400 without a signature header and never touches the handlers', async () => {
    const response = await post(null);

    expect(response.status).toBe(400);
    expect(mockConstructEvent).not.toHaveBeenCalled();
    expect(mockHasProcessed).not.toHaveBeenCalled();
  });

  it('answers 400 when the signature does not verify', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });

    const response = await post();

    expect(response.status).toBe(400);
    expect(mockHasProcessed).not.toHaveBeenCalled();
    expect(mockCaptureError).toHaveBeenCalledTimes(1);
  });

  it('dispatches on event type and records the event once the handler succeeds', async () => {
    const event = makeEvent('customer.subscription.updated', { id: 'sub_1' });
    mockConstructEvent.mockReturnValue(event);

    const response = await post();

    expect(response.status).toBe(200);
    expect(mockSubscriptionUpdated).toHaveBeenCalledWith({ id: 'sub_1' });
    expect(mockRecordProcessed).toHaveBeenCalledWith(event);
    // Recorded after, not before: the order matters for retries.
    expect(mockRecordProcessed.mock.invocationCallOrder[0]).toBeGreaterThan(
      mockSubscriptionUpdated.mock.invocationCallOrder[0]
    );
  });

  it('acknowledges a redelivered event without running its handler again', async () => {
    mockConstructEvent.mockReturnValue(makeEvent('customer.subscription.deleted', { id: 'sub_1' }));
    mockHasProcessed.mockResolvedValue(true);

    const response = await post();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, duplicate: true });
    expect(mockSubscriptionDeleted).not.toHaveBeenCalled();
    expect(mockRecordProcessed).not.toHaveBeenCalled();
  });

  it('answers 500 and does not record the event when the handler throws, so Stripe retries', async () => {
    mockConstructEvent.mockReturnValue(makeEvent('checkout.session.completed', { id: 'cs_1' }));
    mockCheckoutCompleted.mockRejectedValue(new Error('db down'));

    const response = await post();

    expect(response.status).toBe(500);
    expect(mockRecordProcessed).not.toHaveBeenCalled();
    expect(mockCaptureError).toHaveBeenCalledWith(
      expect.any(Error),
      '[stripe/webhook] handler failed for checkout.session.completed'
    );
  });

  it('answers 500 when the duplicate check itself fails, so the event is retried later', async () => {
    mockConstructEvent.mockReturnValue(makeEvent('customer.subscription.updated', { id: 'sub_1' }));
    mockHasProcessed.mockRejectedValue(new Error('db down'));

    const response = await post();

    expect(response.status).toBe(500);
    expect(mockSubscriptionUpdated).not.toHaveBeenCalled();
  });

  it('still answers 200 when the handler succeeded but the record write failed', async () => {
    mockConstructEvent.mockReturnValue(makeEvent('customer.subscription.updated', { id: 'sub_1' }));
    mockRecordProcessed.mockRejectedValue(new Error('db down'));

    const response = await post();

    expect(response.status).toBe(200);
    expect(mockCaptureError).toHaveBeenCalledWith(
      expect.any(Error),
      '[stripe/webhook] failed to record processed event evt_1'
    );
  });

  it('acknowledges an event type it does not handle without recording it', async () => {
    mockConstructEvent.mockReturnValue(makeEvent('invoice.paid', { id: 'in_1' }));

    const response = await post();

    expect(response.status).toBe(200);
    expect(mockRecordProcessed).not.toHaveBeenCalled();
    expect(mockCheckoutCompleted).not.toHaveBeenCalled();
    expect(mockSubscriptionUpdated).not.toHaveBeenCalled();
    expect(mockSubscriptionDeleted).not.toHaveBeenCalled();
  });
});
