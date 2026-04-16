import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInsertValues = vi.fn();
const mockOnConflictDoUpdate = vi.fn();
const mockUpdateSetWhere = vi.fn();
const mockUpdateReturning = vi.fn();
const mockSelectLimit = vi.fn();

vi.mock('@/lib/db', () => ({
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
          where: () => ({
            returning: () => mockUpdateReturning(),
          }),
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
  subscriptions: { stripeSubscriptionId: 'stripe_subscription_id', id: 'id' },
}));

const mockStripe = {
  subscriptions: {
    retrieve: vi.fn(),
  },
};

vi.mock('@/lib/billing/stripe', () => ({
  getStripe: () => mockStripe,
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('server-only', () => ({}));

const mockCaptureMessage = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

const {
  toSubscriptionFields,
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} = await import('./stripe-webhook-handlers');
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

  it('should throw when items.data is empty', () => {
    const sub = {
      id: 'sub_empty',
      status: 'active',
      cancel_at_period_end: false,
      items: { data: [] },
    } as unknown as Stripe.Subscription;

    expect(() => toSubscriptionFields(sub)).toThrow('Subscription sub_empty has no items');
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

    expect(vi.mocked(mockStripe.subscriptions.retrieve)).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should skip if session mode is setup', async () => {
    const session = {
      mode: 'setup',
      subscription: 'sub_123',
    } as unknown as Stripe.Checkout.Session;

    await handleCheckoutCompleted(session);

    expect(vi.mocked(mockStripe.subscriptions.retrieve)).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should skip if session.subscription is null', async () => {
    const session = {
      mode: 'subscription',
      subscription: null,
    } as unknown as Stripe.Checkout.Session;

    await handleCheckoutCompleted(session);

    expect(vi.mocked(mockStripe.subscriptions.retrieve)).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should skip if session.subscription is undefined', async () => {
    const session = {
      mode: 'subscription',
      subscription: undefined,
    } as unknown as Stripe.Checkout.Session;

    await handleCheckoutCompleted(session);

    expect(vi.mocked(mockStripe.subscriptions.retrieve)).not.toHaveBeenCalled();
  });

  it('should skip if session.subscription is empty string (falsy)', async () => {
    const session = {
      mode: 'subscription',
      subscription: '',
    } as unknown as Stripe.Checkout.Session;

    await handleCheckoutCompleted(session);

    expect(vi.mocked(mockStripe.subscriptions.retrieve)).not.toHaveBeenCalled();
  });

  it('should report to Sentry and return when session.customer is null', async () => {
    const session = {
      id: 'cs_test_123',
      mode: 'subscription',
      subscription: 'sub_123',
      customer: null,
    } as unknown as Stripe.Checkout.Session;

    vi.mocked(mockStripe.subscriptions.retrieve).mockResolvedValue(
      createMockSubscription() as unknown as Stripe.Response<Stripe.Subscription>
    );

    await handleCheckoutCompleted(session);

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'checkout.session.completed: session cs_test_123 has no customer (subscription: sub_123)',
      'error'
    );
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should report to Sentry with error severity (not warning) when session.customer is null', async () => {
    const session = {
      id: 'cs_sev_test',
      mode: 'subscription',
      subscription: 'sub_sev',
      customer: null,
    } as unknown as Stripe.Checkout.Session;

    vi.mocked(mockStripe.subscriptions.retrieve).mockResolvedValue(
      createMockSubscription() as unknown as Stripe.Response<Stripe.Subscription>
    );

    await handleCheckoutCompleted(session);

    expect(mockCaptureMessage).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('should not call revalidateTag when session.customer is null', async () => {
    const session = {
      id: 'cs_no_reval',
      mode: 'subscription',
      subscription: 'sub_no_reval',
      customer: null,
    } as unknown as Stripe.Checkout.Session;

    vi.mocked(mockStripe.subscriptions.retrieve).mockResolvedValue(
      createMockSubscription() as unknown as Stripe.Response<Stripe.Subscription>
    );

    await handleCheckoutCompleted(session);

    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('should handle session.customer as Stripe.Customer object', async () => {
    const session = {
      mode: 'subscription',
      subscription: 'sub_cust_obj',
      customer: { id: 'cus_from_object' },
    } as unknown as Stripe.Checkout.Session;

    vi.mocked(mockStripe.subscriptions.retrieve).mockResolvedValue(
      createMockSubscription() as unknown as Stripe.Response<Stripe.Subscription>
    );
    mockSelectLimit.mockResolvedValue([{ userId: 'user_from_obj' }]);

    await handleCheckoutCompleted(session);

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_from_obj',
      })
    );
  });

  it('should handle session.subscription as Stripe.Subscription object', async () => {
    const session = {
      mode: 'subscription',
      subscription: { id: 'sub_from_object' },
      customer: 'cus_sub_obj',
    } as unknown as Stripe.Checkout.Session;

    vi.mocked(mockStripe.subscriptions.retrieve).mockResolvedValue(
      createMockSubscription({ id: 'sub_from_object' } as Record<
        string,
        unknown
      >) as unknown as Stripe.Response<Stripe.Subscription>
    );
    mockSelectLimit.mockResolvedValue([{ userId: 'user_sub_obj' }]);

    await handleCheckoutCompleted(session);

    expect(vi.mocked(mockStripe.subscriptions.retrieve)).toHaveBeenCalledWith('sub_from_object');
  });

  it('should throw when no customer record is found', async () => {
    const session = {
      mode: 'subscription',
      subscription: 'sub_123',
      customer: 'cus_unknown',
    } as unknown as Stripe.Checkout.Session;

    vi.mocked(mockStripe.subscriptions.retrieve).mockResolvedValue(
      createMockSubscription() as unknown as Stripe.Response<Stripe.Subscription>
    );
    mockSelectLimit.mockResolvedValue([]);

    await expect(handleCheckoutCompleted(session)).rejects.toThrow(
      'No stripe_customers record for customer: cus_unknown'
    );
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should upsert subscription when checkout completes successfully', async () => {
    const session = {
      mode: 'subscription',
      subscription: 'sub_123',
      customer: 'cus_456',
    } as unknown as Stripe.Checkout.Session;

    vi.mocked(mockStripe.subscriptions.retrieve).mockResolvedValue(
      createMockSubscription() as unknown as Stripe.Response<Stripe.Subscription>
    );
    mockSelectLimit.mockResolvedValue([{ userId: 'user_789' }]);

    await handleCheckoutCompleted(session);

    expect(vi.mocked(mockStripe.subscriptions.retrieve)).toHaveBeenCalledWith('sub_123');
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_789',
        stripeSubscriptionId: 'sub_123',
        stripePriceId: 'price_abc',
        status: 'active',
      })
    );
    expect(mockOnConflictDoUpdate).toHaveBeenCalled();
    expect(revalidateTag).toHaveBeenCalledWith('subscription-status', { expire: 60 });
  });

  it('should pass subscription ID as string to stripe.subscriptions.retrieve', async () => {
    const session = {
      mode: 'subscription',
      subscription: 'sub_specific_id',
      customer: 'cus_456',
    } as unknown as Stripe.Checkout.Session;

    vi.mocked(mockStripe.subscriptions.retrieve).mockResolvedValue(
      createMockSubscription() as unknown as Stripe.Response<Stripe.Subscription>
    );
    mockSelectLimit.mockResolvedValue([{ userId: 'user_789' }]);

    await handleCheckoutCompleted(session);

    expect(vi.mocked(mockStripe.subscriptions.retrieve)).toHaveBeenCalledWith('sub_specific_id');
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

    vi.mocked(mockStripe.subscriptions.retrieve).mockResolvedValue(
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
    mockUpdateReturning.mockResolvedValue([{ id: 'some-id' }]);

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
    mockUpdateReturning.mockResolvedValue([{ id: 'some-id' }]);

    await handleSubscriptionUpdated(createMockSubscription());

    expect(revalidateTag).toHaveBeenCalledWith('subscription-status', { expire: 60 });
  });

  it('should pass updated fields for a past_due subscription', async () => {
    mockUpdateReturning.mockResolvedValue([{ id: 'some-id' }]);

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
    mockUpdateReturning.mockResolvedValue([{ id: 'some-id' }]);

    const before = Date.now();
    await handleSubscriptionUpdated(createMockSubscription());
    const after = Date.now();

    const setArgs = mockUpdateSetWhere.mock.calls[0][0];
    expect(setArgs.updatedAt).toBeInstanceOf(Date);
    expect(setArgs.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(setArgs.updatedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('should update with trialing status and new period timestamps', async () => {
    mockUpdateReturning.mockResolvedValue([{ id: 'some-id' }]);

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

  it('should insert subscription when update affects 0 rows and customer record exists', async () => {
    mockUpdateReturning.mockResolvedValue([]);
    mockSelectLimit.mockResolvedValue([{ userId: 'user_recovered' }]);

    const sub = createMockSubscription({ customer: 'cus_recovery' } as Record<string, unknown>);
    await handleSubscriptionUpdated(sub);

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_recovered',
        stripeSubscriptionId: 'sub_123',
        stripePriceId: 'price_abc',
        status: 'active',
      })
    );
    expect(mockOnConflictDoUpdate).toHaveBeenCalled();
    expect(revalidateTag).toHaveBeenCalledWith('subscription-status', { expire: 60 });
  });

  it('should report to Sentry when update affects 0 rows and no customer record found', async () => {
    mockUpdateReturning.mockResolvedValue([]);
    mockSelectLimit.mockResolvedValue([]);

    const sub = createMockSubscription({ customer: 'cus_orphan' } as Record<string, unknown>);
    await handleSubscriptionUpdated(sub);

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining('no stripe_customers record for customer cus_orphan'),
      'warning'
    );
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should not attempt recovery when update affects rows', async () => {
    mockUpdateReturning.mockResolvedValue([{ id: 'existing-id' }]);

    await handleSubscriptionUpdated(
      createMockSubscription({ customer: 'cus_existing' } as Record<string, unknown>)
    );

    expect(mockSelectLimit).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('should handle subscription.customer as Stripe.Customer object during recovery', async () => {
    mockUpdateReturning.mockResolvedValue([]);
    mockSelectLimit.mockResolvedValue([{ userId: 'user_obj' }]);

    const sub = createMockSubscription({
      customer: { id: 'cus_from_obj' },
    } as Record<string, unknown>);
    await handleSubscriptionUpdated(sub);

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_obj',
        stripeSubscriptionId: 'sub_123',
      })
    );
  });

  it('should handle subscription.customer as Stripe.Customer object when no customer record found (Sentry path)', async () => {
    mockUpdateReturning.mockResolvedValue([]);
    mockSelectLimit.mockResolvedValue([]);

    const sub = createMockSubscription({
      customer: { id: 'cus_obj_orphan' },
    } as Record<string, unknown>);
    await handleSubscriptionUpdated(sub);

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining('no stripe_customers record for customer cus_obj_orphan'),
      'warning'
    );
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('should propagate DB errors from recovery insert', async () => {
    mockUpdateReturning.mockResolvedValue([]);
    mockSelectLimit.mockResolvedValue([{ userId: 'user_err' }]);
    mockInsertValues.mockImplementationOnce(() => {
      throw new Error('DB connection lost');
    });

    const sub = createMockSubscription({ customer: 'cus_db_err' } as Record<string, unknown>);

    await expect(handleSubscriptionUpdated(sub)).rejects.toThrow('DB connection lost');
  });

  it('should call revalidateTag even when recovery insert is performed', async () => {
    mockUpdateReturning.mockResolvedValue([]);
    mockSelectLimit.mockResolvedValue([{ userId: 'user_revalidate' }]);

    const sub = createMockSubscription({ customer: 'cus_reval' } as Record<string, unknown>);
    await handleSubscriptionUpdated(sub);

    expect(revalidateTag).toHaveBeenCalledWith('subscription-status', { expire: 60 });
  });

  it('should call revalidateTag even when Sentry warning is reported (no customer record)', async () => {
    mockUpdateReturning.mockResolvedValue([]);
    mockSelectLimit.mockResolvedValue([]);

    const sub = createMockSubscription({ customer: 'cus_no_record' } as Record<string, unknown>);
    await handleSubscriptionUpdated(sub);

    expect(mockCaptureMessage).toHaveBeenCalled();
    expect(revalidateTag).toHaveBeenCalledWith('subscription-status', { expire: 60 });
  });

  it('should include correct subscription fields in recovery insert', async () => {
    mockUpdateReturning.mockResolvedValue([]);
    mockSelectLimit.mockResolvedValue([{ userId: 'user_fields' }]);

    const sub = createMockSubscription({
      customer: 'cus_fields',
      status: 'past_due',
      cancel_at_period_end: true,
      priceId: 'price_recovery',
      periodStart: 1710000000,
      periodEnd: 1712678400,
    } as Record<string, unknown>);
    await handleSubscriptionUpdated(sub);

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_fields',
        stripeSubscriptionId: 'sub_123',
        stripePriceId: 'price_recovery',
        status: 'past_due',
        cancelAtPeriodEnd: true,
        currentPeriodStart: new Date(1710000000 * 1000),
        currentPeriodEnd: new Date(1712678400 * 1000),
      })
    );
  });

  it('should propagate DB errors from the initial update query', async () => {
    mockUpdateReturning.mockRejectedValue(new Error('Update query failed'));

    await expect(handleSubscriptionUpdated(createMockSubscription())).rejects.toThrow(
      'Update query failed'
    );
  });
});

// ── handleSubscriptionDeleted ────────────────────────────────────────

describe('handleSubscriptionDeleted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set status to canceled and cancelAtPeriodEnd to false', async () => {
    mockUpdateReturning.mockResolvedValue([{ id: 'some-id' }]);

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
    mockUpdateReturning.mockResolvedValue([{ id: 'some-id' }]);

    await handleSubscriptionDeleted(createMockSubscription());

    expect(revalidateTag).toHaveBeenCalledWith('subscription-status', { expire: 60 });
  });

  it('should override whatever previous status the subscription had', async () => {
    mockUpdateReturning.mockResolvedValue([{ id: 'some-id' }]);

    await handleSubscriptionDeleted(createMockSubscription({ status: 'active' }));

    expect(mockUpdateSetWhere).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'canceled' })
    );
  });

  it('should force cancelAtPeriodEnd to false regardless of input', async () => {
    mockUpdateReturning.mockResolvedValue([{ id: 'some-id' }]);

    await handleSubscriptionDeleted(createMockSubscription({ cancel_at_period_end: true }));

    expect(mockUpdateSetWhere).toHaveBeenCalledWith(
      expect.objectContaining({ cancelAtPeriodEnd: false })
    );
  });

  it('should include updatedAt as a Date in the set call', async () => {
    mockUpdateReturning.mockResolvedValue([{ id: 'some-id' }]);

    const before = Date.now();
    await handleSubscriptionDeleted(createMockSubscription());
    const after = Date.now();

    const setArgs = mockUpdateSetWhere.mock.calls[0][0];
    expect(setArgs.updatedAt).toBeInstanceOf(Date);
    expect(setArgs.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(setArgs.updatedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('should not include subscription field mapping (uses hardcoded values)', async () => {
    mockUpdateReturning.mockResolvedValue([{ id: 'some-id' }]);

    await handleSubscriptionDeleted(createMockSubscription({ priceId: 'price_should_be_ignored' }));

    const setArgs = mockUpdateSetWhere.mock.calls[0][0];
    // handleSubscriptionDeleted does NOT use toSubscriptionFields — it sets hardcoded values
    expect(setArgs).not.toHaveProperty('stripePriceId');
    expect(setArgs).not.toHaveProperty('currentPeriodStart');
    expect(setArgs).not.toHaveProperty('currentPeriodEnd');
  });

  it('should report to Sentry when update affects 0 rows', async () => {
    mockUpdateReturning.mockResolvedValue([]);

    await handleSubscriptionDeleted(createMockSubscription());

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining('no subscription record found for subscription sub_123'),
      'warning'
    );
  });

  it('should not report to Sentry when update affects rows', async () => {
    mockUpdateReturning.mockResolvedValue([{ id: 'existing-id' }]);

    await handleSubscriptionDeleted(createMockSubscription());

    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('should call revalidateTag even when Sentry warning is reported (0 rows)', async () => {
    mockUpdateReturning.mockResolvedValue([]);

    await handleSubscriptionDeleted(createMockSubscription());

    expect(mockCaptureMessage).toHaveBeenCalled();
    expect(revalidateTag).toHaveBeenCalledWith('subscription-status', { expire: 60 });
  });

  it('should include subscription ID in Sentry message when 0 rows affected', async () => {
    mockUpdateReturning.mockResolvedValue([]);

    const sub = createMockSubscription({ id: 'sub_specific_deleted' } as Record<string, unknown>);
    await handleSubscriptionDeleted(sub);

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining('sub_specific_deleted'),
      'warning'
    );
  });

  it('should propagate DB errors from the update query', async () => {
    mockUpdateReturning.mockRejectedValue(new Error('Delete update failed'));

    await expect(handleSubscriptionDeleted(createMockSubscription())).rejects.toThrow(
      'Delete update failed'
    );
  });
});
