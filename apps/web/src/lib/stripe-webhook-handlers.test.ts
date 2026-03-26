import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInsertValues = vi.fn();
const mockOnConflictDoUpdate = vi.fn();
const mockUpdateSetWhere = vi.fn();
const mockSelectLimit = vi.fn();

vi.mock('./db', () => ({
  db: {
    insert: () => ({
      values: (...args: unknown[]) => {
        mockInsertValues(...args);
        return {
          onConflictDoUpdate: (...a: unknown[]) => {
            mockOnConflictDoUpdate(...a);
            return Promise.resolve();
          },
        };
      },
    }),
    update: () => ({
      set: (...args: unknown[]) => {
        mockUpdateSetWhere(...args);
        return {
          where: () => Promise.resolve(),
        };
      },
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockSelectLimit(),
        }),
      }),
    }),
  },
  stripeCustomers: { stripeCustomerId: 'stripe_customer_id', userId: 'user_id' },
  subscriptions: { stripeSubscriptionId: 'stripe_subscription_id' },
}));

vi.mock('./stripe', () => ({
  stripe: {
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('server-only', () => ({}));

const {
  toSubscriptionFields,
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} = await import('./stripe-webhook-handlers');
const { stripe } = await import('./stripe');
const { revalidateTag } = await import('next/cache');

// ── Helper ───────────────────────────────────────────────────────────

function createMockSubscription(
  overrides?: Partial<Stripe.Subscription> & {
    priceId?: string;
    periodStart?: number;
    periodEnd?: number;
  }
): Stripe.Subscription {
  const {
    priceId = 'price_abc',
    periodStart = 1700000000,
    periodEnd = 1702592000,
    ...rest
  } = overrides ?? {};

  return {
    id: 'sub_123',
    status: 'active',
    cancel_at_period_end: false,
    items: {
      data: [
        {
          price: { id: priceId },
          current_period_start: periodStart,
          current_period_end: periodEnd,
        },
      ],
    },
    ...rest,
  } as unknown as Stripe.Subscription;
}

// ── toSubscriptionFields ─────────────────────────────────────────────

describe('toSubscriptionFields', () => {
  it('should map an active Stripe Subscription to DB fields', () => {
    const subscription = createMockSubscription();
    const fields = toSubscriptionFields(subscription);

    expect(fields).toEqual({
      stripePriceId: 'price_abc',
      status: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodStart: new Date(1700000000 * 1000),
      currentPeriodEnd: new Date(1702592000 * 1000),
    });
  });

  it('should handle trialing status', () => {
    const fields = toSubscriptionFields(createMockSubscription({ status: 'trialing' }));
    expect(fields.status).toBe('trialing');
  });

  it('should handle canceled status', () => {
    const fields = toSubscriptionFields(createMockSubscription({ status: 'canceled' }));
    expect(fields.status).toBe('canceled');
  });

  it('should handle past_due status', () => {
    const fields = toSubscriptionFields(createMockSubscription({ status: 'past_due' }));
    expect(fields.status).toBe('past_due');
  });

  it('should handle unpaid status', () => {
    const fields = toSubscriptionFields(createMockSubscription({ status: 'unpaid' }));
    expect(fields.status).toBe('unpaid');
  });

  it('should handle incomplete status', () => {
    const fields = toSubscriptionFields(createMockSubscription({ status: 'incomplete' }));
    expect(fields.status).toBe('incomplete');
  });

  it('should handle incomplete_expired status', () => {
    const fields = toSubscriptionFields(createMockSubscription({ status: 'incomplete_expired' }));
    expect(fields.status).toBe('incomplete_expired');
  });

  it('should handle paused status', () => {
    const fields = toSubscriptionFields(createMockSubscription({ status: 'paused' }));
    expect(fields.status).toBe('paused');
  });

  it('should map cancel_at_period_end = true', () => {
    const fields = toSubscriptionFields(createMockSubscription({ cancel_at_period_end: true }));
    expect(fields.cancelAtPeriodEnd).toBe(true);
  });

  it('should convert Unix timestamps to Date objects', () => {
    const fields = toSubscriptionFields(createMockSubscription());

    expect(fields.currentPeriodStart).toBeInstanceOf(Date);
    expect(fields.currentPeriodEnd).toBeInstanceOf(Date);
    expect(fields.currentPeriodStart.getTime()).toBe(1700000000000);
    expect(fields.currentPeriodEnd.getTime()).toBe(1702592000000);
  });

  it('should handle epoch 0 timestamps', () => {
    const fields = toSubscriptionFields(createMockSubscription({ periodStart: 0, periodEnd: 0 }));

    expect(fields.currentPeriodStart).toEqual(new Date(0));
    expect(fields.currentPeriodEnd).toEqual(new Date(0));
  });

  it('should handle very large timestamps (year 2038+ boundary)', () => {
    const fields = toSubscriptionFields(
      createMockSubscription({ periodStart: 2147483647, periodEnd: 2147483648 })
    );

    expect(fields.currentPeriodStart).toEqual(new Date(2147483647 * 1000));
    expect(fields.currentPeriodEnd).toEqual(new Date(2147483648 * 1000));
  });

  it('should use the first subscription item when multiple items exist', () => {
    const sub = {
      id: 'sub_multi',
      status: 'active',
      cancel_at_period_end: false,
      items: {
        data: [
          {
            price: { id: 'price_first' },
            current_period_start: 1700000000,
            current_period_end: 1702592000,
          },
          {
            price: { id: 'price_second' },
            current_period_start: 1700000000,
            current_period_end: 1702592000,
          },
        ],
      },
    } as unknown as Stripe.Subscription;

    const fields = toSubscriptionFields(sub);
    expect(fields.stripePriceId).toBe('price_first');
  });

  it('should correctly map different price IDs', () => {
    const fields = toSubscriptionFields(
      createMockSubscription({ priceId: 'price_annual_xyz_999' })
    );
    expect(fields.stripePriceId).toBe('price_annual_xyz_999');
  });
});

// ── handleCheckoutCompleted ──────────────────────────────────────────

describe('handleCheckoutCompleted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should skip if session mode is not subscription', async () => {
    const session = {
      mode: 'payment',
      subscription: 'sub_123',
    } as unknown as Stripe.Checkout.Session;

    await handleCheckoutCompleted(session);

    expect(vi.mocked(stripe.subscriptions.retrieve)).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should skip if session mode is setup', async () => {
    const session = {
      mode: 'setup',
      subscription: 'sub_123',
    } as unknown as Stripe.Checkout.Session;

    await handleCheckoutCompleted(session);

    expect(vi.mocked(stripe.subscriptions.retrieve)).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should skip if session.subscription is null', async () => {
    const session = {
      mode: 'subscription',
      subscription: null,
    } as unknown as Stripe.Checkout.Session;

    await handleCheckoutCompleted(session);

    expect(vi.mocked(stripe.subscriptions.retrieve)).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should skip if session.subscription is undefined', async () => {
    const session = {
      mode: 'subscription',
      subscription: undefined,
    } as unknown as Stripe.Checkout.Session;

    await handleCheckoutCompleted(session);

    expect(vi.mocked(stripe.subscriptions.retrieve)).not.toHaveBeenCalled();
  });

  it('should skip if session.subscription is empty string (falsy)', async () => {
    const session = {
      mode: 'subscription',
      subscription: '',
    } as unknown as Stripe.Checkout.Session;

    await handleCheckoutCompleted(session);

    expect(vi.mocked(stripe.subscriptions.retrieve)).not.toHaveBeenCalled();
  });

  it('should log error and return when no customer record is found', async () => {
    const session = {
      mode: 'subscription',
      subscription: 'sub_123',
      customer: 'cus_unknown',
    } as unknown as Stripe.Checkout.Session;

    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(
      createMockSubscription() as unknown as Stripe.Response<Stripe.Subscription>
    );
    mockSelectLimit.mockResolvedValue([]);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await handleCheckoutCompleted(session);

    expect(consoleSpy).toHaveBeenCalledWith(
      'No stripe_customers record for customer:',
      'cus_unknown'
    );
    expect(mockInsertValues).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should upsert subscription when checkout completes successfully', async () => {
    const session = {
      mode: 'subscription',
      subscription: 'sub_123',
      customer: 'cus_456',
    } as unknown as Stripe.Checkout.Session;

    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(
      createMockSubscription() as unknown as Stripe.Response<Stripe.Subscription>
    );
    mockSelectLimit.mockResolvedValue([{ userId: 'user_789' }]);

    await handleCheckoutCompleted(session);

    expect(vi.mocked(stripe.subscriptions.retrieve)).toHaveBeenCalledWith('sub_123');
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_789',
        stripeSubscriptionId: 'sub_123',
        stripePriceId: 'price_abc',
        status: 'active',
      })
    );
    expect(mockOnConflictDoUpdate).toHaveBeenCalled();
    expect(revalidateTag).toHaveBeenCalledWith('subscription-status', expect.any(Object));
  });

  it('should pass subscription ID as string to stripe.subscriptions.retrieve', async () => {
    const session = {
      mode: 'subscription',
      subscription: 'sub_specific_id',
      customer: 'cus_456',
    } as unknown as Stripe.Checkout.Session;

    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(
      createMockSubscription() as unknown as Stripe.Response<Stripe.Subscription>
    );
    mockSelectLimit.mockResolvedValue([{ userId: 'user_789' }]);

    await handleCheckoutCompleted(session);

    expect(vi.mocked(stripe.subscriptions.retrieve)).toHaveBeenCalledWith('sub_specific_id');
  });

  it('should include all mapped subscription fields in the upsert', async () => {
    const sub = createMockSubscription({
      status: 'trialing',
      cancel_at_period_end: false,
      priceId: 'price_trial',
      periodStart: 1710000000,
      periodEnd: 1712678400,
    });

    const session = {
      mode: 'subscription',
      subscription: sub.id,
      customer: 'cus_456',
    } as unknown as Stripe.Checkout.Session;

    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(
      sub as unknown as Stripe.Response<Stripe.Subscription>
    );
    mockSelectLimit.mockResolvedValue([{ userId: 'user_trial' }]);

    await handleCheckoutCompleted(session);

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_trial',
        stripeSubscriptionId: 'sub_123',
        stripePriceId: 'price_trial',
        status: 'trialing',
        cancelAtPeriodEnd: false,
        currentPeriodStart: new Date(1710000000 * 1000),
        currentPeriodEnd: new Date(1712678400 * 1000),
      })
    );
  });
});

// ── handleSubscriptionUpdated ────────────────────────────────────────

describe('handleSubscriptionUpdated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update subscription fields in DB', async () => {
    await handleSubscriptionUpdated(createMockSubscription());

    expect(mockUpdateSetWhere).toHaveBeenCalledWith(
      expect.objectContaining({
        stripePriceId: 'price_abc',
        status: 'active',
        cancelAtPeriodEnd: false,
        updatedAt: expect.any(Date),
      })
    );
  });

  it('should call revalidateTag after update', async () => {
    await handleSubscriptionUpdated(createMockSubscription());

    expect(revalidateTag).toHaveBeenCalledWith('subscription-status', expect.any(Object));
  });

  it('should pass updated fields for a past_due subscription', async () => {
    await handleSubscriptionUpdated(
      createMockSubscription({ status: 'past_due', cancel_at_period_end: true })
    );

    expect(mockUpdateSetWhere).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'past_due',
        cancelAtPeriodEnd: true,
      })
    );
  });

  it('should include updatedAt as a Date in the set call', async () => {
    const before = Date.now();
    await handleSubscriptionUpdated(createMockSubscription());
    const after = Date.now();

    const setArgs = mockUpdateSetWhere.mock.calls[0][0];
    expect(setArgs.updatedAt).toBeInstanceOf(Date);
    expect(setArgs.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(setArgs.updatedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('should update with trialing status and new period timestamps', async () => {
    const sub = createMockSubscription({
      status: 'trialing',
      periodStart: 1710000000,
      periodEnd: 1712678400,
    });

    await handleSubscriptionUpdated(sub);

    expect(mockUpdateSetWhere).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'trialing',
        currentPeriodStart: new Date(1710000000 * 1000),
        currentPeriodEnd: new Date(1712678400 * 1000),
      })
    );
  });
});

// ── handleSubscriptionDeleted ────────────────────────────────────────

describe('handleSubscriptionDeleted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set status to canceled and cancelAtPeriodEnd to false', async () => {
    await handleSubscriptionDeleted(createMockSubscription());

    expect(mockUpdateSetWhere).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'canceled',
        cancelAtPeriodEnd: false,
        updatedAt: expect.any(Date),
      })
    );
  });

  it('should call revalidateTag after deletion', async () => {
    await handleSubscriptionDeleted(createMockSubscription());

    expect(revalidateTag).toHaveBeenCalledWith('subscription-status', expect.any(Object));
  });

  it('should override whatever previous status the subscription had', async () => {
    await handleSubscriptionDeleted(createMockSubscription({ status: 'active' }));

    expect(mockUpdateSetWhere).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'canceled' })
    );
  });

  it('should force cancelAtPeriodEnd to false regardless of input', async () => {
    await handleSubscriptionDeleted(createMockSubscription({ cancel_at_period_end: true }));

    expect(mockUpdateSetWhere).toHaveBeenCalledWith(
      expect.objectContaining({ cancelAtPeriodEnd: false })
    );
  });

  it('should include updatedAt as a Date in the set call', async () => {
    const before = Date.now();
    await handleSubscriptionDeleted(createMockSubscription());
    const after = Date.now();

    const setArgs = mockUpdateSetWhere.mock.calls[0][0];
    expect(setArgs.updatedAt).toBeInstanceOf(Date);
    expect(setArgs.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(setArgs.updatedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('should not include subscription field mapping (uses hardcoded values)', async () => {
    await handleSubscriptionDeleted(createMockSubscription({ priceId: 'price_should_be_ignored' }));

    const setArgs = mockUpdateSetWhere.mock.calls[0][0];
    // handleSubscriptionDeleted does NOT use toSubscriptionFields — it sets hardcoded values
    expect(setArgs).not.toHaveProperty('stripePriceId');
    expect(setArgs).not.toHaveProperty('currentPeriodStart');
    expect(setArgs).not.toHaveProperty('currentPeriodEnd');
  });
});
