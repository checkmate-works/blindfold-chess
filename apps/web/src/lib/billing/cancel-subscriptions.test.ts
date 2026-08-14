import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cancelAllActiveSubscriptions } from './cancel-subscriptions';

const mockSelectWhere = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => mockSelectWhere(...args),
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        mockUpdateSet(values);
        return { where: () => mockUpdateWhere() };
      },
    }),
  },
  subscriptions: {
    id: 'id',
    userId: 'user_id',
    stripeSubscriptionId: 'stripe_subscription_id',
    status: 'status',
  },
}));

const mockCancel = vi.fn();
vi.mock('@/lib/billing/stripe', () => ({
  getStripe: () => ({ subscriptions: { cancel: mockCancel } }),
}));

const mockCaptureMessage = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

const testUserId = 'user-id-00000000-0000-0000-0000-000000000001';

describe('cancelAllActiveSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateWhere.mockResolvedValue(undefined);
    mockCancel.mockResolvedValue(undefined);
  });

  it('immediately cancels an active subscription and marks the DB row canceled', async () => {
    mockSelectWhere.mockResolvedValue([
      { id: 'row-1', stripeSubscriptionId: 'sub_1', status: 'active' },
    ]);

    await cancelAllActiveSubscriptions(testUserId);

    expect(mockCancel).toHaveBeenCalledWith('sub_1');

    const values = mockUpdateSet.mock.calls[0][0];
    expect(values.status).toBe('canceled');
    expect(values.cancelAt).toBeInstanceOf(Date);
    expect(values.updatedAt).toBeInstanceOf(Date);
  });

  it('skips a row already canceled without calling Stripe', async () => {
    mockSelectWhere.mockResolvedValue([
      { id: 'row-1', stripeSubscriptionId: 'sub_1', status: 'canceled' },
    ]);

    await cancelAllActiveSubscriptions(testUserId);

    expect(mockCancel).not.toHaveBeenCalled();
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it('treats a Stripe 404 as success and still syncs the DB', async () => {
    mockSelectWhere.mockResolvedValue([
      { id: 'row-1', stripeSubscriptionId: 'sub_missing', status: 'active' },
    ]);
    mockCancel.mockRejectedValue({ statusCode: 404, code: 'resource_missing' });

    await expect(cancelAllActiveSubscriptions(testUserId)).resolves.toBeUndefined();

    expect(mockCaptureMessage).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'canceled' }));
  });

  it('rethrows a genuine Stripe failure and does not update the DB', async () => {
    mockSelectWhere.mockResolvedValue([
      { id: 'row-1', stripeSubscriptionId: 'sub_1', status: 'active' },
    ]);
    mockCancel.mockRejectedValue({ statusCode: 500, message: 'Stripe is down' });

    await expect(cancelAllActiveSubscriptions(testUserId)).rejects.toMatchObject({
      statusCode: 500,
    });

    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it('is a no-op for users with no subscriptions', async () => {
    mockSelectWhere.mockResolvedValue([]);

    await cancelAllActiveSubscriptions(testUserId);

    expect(mockCancel).not.toHaveBeenCalled();
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });
});
