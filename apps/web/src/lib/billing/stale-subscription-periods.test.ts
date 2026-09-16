import * as Sentry from '@sentry/nextjs';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

/**
 * The audit's whole value is in two things a return value cannot show: which
 * rows the query asks for, and what reaches Sentry. So the WHERE is captured
 * and rendered to SQL (`sqlToQuery` needs no connection), and the reporting
 * assertions read the captured payload rather than trusting that a non-zero
 * count implies a warning was sent.
 */
const dialect = new PgDialect();
function render(condition: SQL | undefined): string {
  if (!condition) return '';
  const { sql, params } = dialect.sqlToQuery(condition);
  const bound = sql.replace(/\$(\d+)/g, (_, i) => {
    const v = params[Number(i) - 1];
    return typeof v === 'string' ? `'${v}'` : String(v);
  });
  return bound.replace(/\s+/g, ' ');
}

const state: { where: SQL | undefined; limit: number; rows: StaleRow[] } = {
  where: undefined,
  limit: 0,
  rows: [],
};

type StaleRow = { stripeSubscriptionId: string; status: string; currentPeriodEnd: Date };

vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn() }));

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    select: () => ({
      from: () => ({
        where: (condition: SQL | undefined) => ({
          orderBy: () => ({
            limit: (limit: number) => {
              state.where = condition;
              state.limit = limit;
              return Promise.resolve(state.rows);
            },
          }),
        }),
      }),
    }),
  },
}));

const { STALE_PERIOD_GRACE_MS, reportStaleSubscriptionPeriods } =
  await import('./stale-subscription-periods');

const NOW = new Date('2026-09-16T07:00:00.000Z');
const CUTOFF = new Date(NOW.getTime() - STALE_PERIOD_GRACE_MS);

/**
 * The captured `captureMessage` context, narrowed to the object form. Its
 * parameter type also admits a bare severity string, which this module never
 * passes, and the union has no `extra` to read.
 */
function capturedContext(call = 0): {
  level?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
} {
  const [, context] = vi.mocked(Sentry.captureMessage).mock.calls[call]!;
  return context as {
    level?: string;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  };
}

function makeRows(count: number): StaleRow[] {
  return Array.from({ length: count }, (_, i) => ({
    stripeSubscriptionId: `sub_${i}`,
    status: 'active',
    currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z'),
  }));
}

describe('reportStaleSubscriptionPeriods', () => {
  beforeEach(() => {
    state.where = undefined;
    state.limit = 0;
    state.rows = [];
    vi.mocked(Sentry.captureMessage).mockClear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('asks only for benefit-granting rows whose period ended before the grace cutoff', async () => {
    await reportStaleSubscriptionPeriods(NOW);

    const where = render(state.where);
    // Both halves matter: the status list is what makes a row a live
    // entitlement, and the cutoff is what separates a lost webhook from a
    // renewal still in flight. A query missing either would report rows that
    // grant nothing, or rows that are about to heal.
    expect(where).toContain(`"subscriptions"."status" in ('active', 'trialing')`);
    expect(where).toContain(`"subscriptions"."current_period_end" < '${CUTOFF.toISOString()}'`);
  });

  it('leaves three days of grace before a row counts as stale', () => {
    expect(STALE_PERIOD_GRACE_MS).toBe(3 * 24 * 60 * 60 * 1000);
  });

  it('reports nothing to Sentry when no row is stale', async () => {
    const report = await reportStaleSubscriptionPeriods(NOW);

    expect(Sentry.captureMessage).not.toHaveBeenCalled();
    expect(report).toEqual({
      staleCount: 0,
      truncated: false,
      cutoff: CUTOFF.toISOString(),
      checkedAt: NOW.toISOString(),
    });
  });

  it('warns with the Stripe ids of the stale rows, and nothing identifying the users', async () => {
    state.rows = makeRows(2);

    const report = await reportStaleSubscriptionPeriods(NOW);

    expect(report).toMatchObject({ staleCount: 2, truncated: false });
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    const [message] = vi.mocked(Sentry.captureMessage).mock.calls[0]!;
    const options = capturedContext();
    expect(message).toBe('subscription-period-stale');
    expect(options.level).toBe('warning');
    expect(options.extra?.['subscription_audit.rows']).toEqual([
      {
        stripeSubscriptionId: 'sub_0',
        status: 'active',
        currentPeriodEnd: '2026-08-01T00:00:00.000Z',
      },
      {
        stripeSubscriptionId: 'sub_1',
        status: 'active',
        currentPeriodEnd: '2026-08-01T00:00:00.000Z',
      },
    ]);
    expect(JSON.stringify(options)).not.toContain('user');
  });

  it('caps the payload and flags truncation when more rows match than it carries', async () => {
    // The query asks for one row over the cap so the overflow is detectable
    // without a second COUNT(*); that extra row must not reach the report.
    state.rows = makeRows(51);

    const report = await reportStaleSubscriptionPeriods(NOW);

    expect(state.limit).toBe(51);
    expect(report).toMatchObject({ staleCount: 50, truncated: true });
    const options = capturedContext();
    expect(options.extra?.['subscription_audit.count']).toBe(50);
    expect(options.tags?.['subscription_audit.truncated']).toBe('true');
  });
});
