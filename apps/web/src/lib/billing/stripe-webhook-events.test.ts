import { describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

const mockSelectLimit = vi.fn();
const mockInsertValues = vi.fn();
const mockOnConflictDoNothing = vi.fn();

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockSelectLimit(),
        }),
      }),
    }),
    insert: () => ({
      values: (...args: unknown[]) => {
        mockInsertValues(...args);
        return {
          onConflictDoNothing: (...a: unknown[]) => {
            mockOnConflictDoNothing(...a);
            return Promise.resolve();
          },
        };
      },
    }),
  },
}));

const { hasProcessedWebhookEvent, recordProcessedWebhookEvent } =
  await import('./stripe-webhook-events');

describe('hasProcessedWebhookEvent', () => {
  it('is true when a row exists for the event id', async () => {
    mockSelectLimit.mockResolvedValue([{ eventId: 'evt_1' }]);
    await expect(hasProcessedWebhookEvent('evt_1')).resolves.toBe(true);
  });

  it('is false when no row exists', async () => {
    mockSelectLimit.mockResolvedValue([]);
    await expect(hasProcessedWebhookEvent('evt_1')).resolves.toBe(false);
  });

  it('propagates a database failure so the route can answer 500 and be retried', async () => {
    mockSelectLimit.mockRejectedValue(new Error('connection lost'));
    await expect(hasProcessedWebhookEvent('evt_1')).rejects.toThrow('connection lost');
  });
});

describe('recordProcessedWebhookEvent', () => {
  it('stores the id, type and Stripe creation time', async () => {
    await recordProcessedWebhookEvent({
      id: 'evt_1',
      type: 'customer.subscription.updated',
      created: 1700000000,
    });

    expect(mockInsertValues).toHaveBeenCalledWith({
      eventId: 'evt_1',
      eventType: 'customer.subscription.updated',
      eventCreatedAt: new Date(1700000000 * 1000),
    });
  });

  it('ignores a conflicting id so two overlapping deliveries both succeed', async () => {
    await recordProcessedWebhookEvent({
      id: 'evt_1',
      type: 'customer.subscription.updated',
      created: 1700000000,
    });

    expect(mockOnConflictDoNothing).toHaveBeenCalledTimes(1);
  });
});
