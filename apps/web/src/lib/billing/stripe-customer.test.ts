import { describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

const mockSelectLimit = vi.fn();
const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();

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
          onConflictDoNothing: () => ({
            returning: () => mockInsertReturning(),
          }),
        };
      },
    }),
  },
}));

const mockCustomersCreate = vi.fn();
const mockCustomersDel = vi.fn();

vi.mock('@/lib/billing/stripe', () => ({
  getStripe: () => ({
    customers: {
      create: (...args: unknown[]) => mockCustomersCreate(...args),
      del: (...args: unknown[]) => mockCustomersDel(...args),
    },
  }),
}));

const { getOrCreateStripeCustomerId, stripeCustomerIdempotencyKey } =
  await import('./stripe-customer');

describe('getOrCreateStripeCustomerId', () => {
  it('returns the recorded customer without calling Stripe', async () => {
    mockSelectLimit.mockResolvedValue([{ stripeCustomerId: 'cus_existing' }]);

    await expect(getOrCreateStripeCustomerId('user-1', 'u@example.com')).resolves.toBe(
      'cus_existing'
    );
    expect(mockCustomersCreate).not.toHaveBeenCalled();
  });

  it('creates the customer under an idempotency key derived from the user id', async () => {
    mockSelectLimit.mockResolvedValue([]);
    mockCustomersCreate.mockResolvedValue({ id: 'cus_new' });
    mockInsertReturning.mockResolvedValue([{ stripeCustomerId: 'cus_new' }]);

    await expect(getOrCreateStripeCustomerId('user-1', 'u@example.com')).resolves.toBe('cus_new');

    expect(mockCustomersCreate).toHaveBeenCalledWith(
      { email: 'u@example.com', metadata: { supabaseUserId: 'user-1' } },
      { idempotencyKey: stripeCustomerIdempotencyKey('user-1') }
    );
    expect(mockInsertValues).toHaveBeenCalledWith({
      userId: 'user-1',
      stripeCustomerId: 'cus_new',
    });
    expect(mockCustomersDel).not.toHaveBeenCalled();
  });

  it('gives two users two different keys', () => {
    expect(stripeCustomerIdempotencyKey('user-1')).not.toBe(stripeCustomerIdempotencyKey('user-2'));
  });

  it('keeps the customer when a concurrent request recorded the same one first', async () => {
    // Both requests carried the same idempotency key, so Stripe handed both
    // the same customer; the loser's insert conflicts and it reads the winner.
    mockSelectLimit
      .mockResolvedValueOnce([]) // initial lookup: nothing yet
      .mockResolvedValueOnce([{ stripeCustomerId: 'cus_shared' }]); // after conflict
    mockCustomersCreate.mockResolvedValue({ id: 'cus_shared' });
    mockInsertReturning.mockResolvedValue([]);

    await expect(getOrCreateStripeCustomerId('user-1', 'u@example.com')).resolves.toBe(
      'cus_shared'
    );
    expect(mockCustomersDel).not.toHaveBeenCalled();
  });

  it('deletes its own customer only when the recorded one is a different customer', async () => {
    // Reached when the idempotency key had expired between the two attempts,
    // so Stripe did create a second customer that nothing now points at.
    mockSelectLimit
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ stripeCustomerId: 'cus_winner' }]);
    mockCustomersCreate.mockResolvedValue({ id: 'cus_loser' });
    mockInsertReturning.mockResolvedValue([]);
    mockCustomersDel.mockResolvedValue({});

    await expect(getOrCreateStripeCustomerId('user-1', 'u@example.com')).resolves.toBe(
      'cus_winner'
    );
    expect(mockCustomersDel).toHaveBeenCalledWith('cus_loser');
  });

  it('throws when the insert conflicted but no row can be read back', async () => {
    mockSelectLimit.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockCustomersCreate.mockResolvedValue({ id: 'cus_new' });
    mockInsertReturning.mockResolvedValue([]);

    await expect(getOrCreateStripeCustomerId('user-1', 'u@example.com')).rejects.toThrow(
      'after conflict resolution'
    );
  });

  it('propagates a Stripe failure, including the 409 for a key still in flight', async () => {
    mockSelectLimit.mockResolvedValue([]);
    const inFlight = Object.assign(new Error('in progress'), { statusCode: 409 });
    mockCustomersCreate.mockRejectedValue(inFlight);

    await expect(getOrCreateStripeCustomerId('user-1', 'u@example.com')).rejects.toBe(inFlight);
    expect(mockInsertValues).not.toHaveBeenCalled();
  });
});
