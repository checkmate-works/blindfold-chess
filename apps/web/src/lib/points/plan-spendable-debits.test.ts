import { describe, expect, it } from 'vitest';

import type { PointCategory } from './constants';
import { planSpendableDebits } from './internal-ledger';

const wallet = (entries: Partial<Record<PointCategory, number>>) =>
  new Map(Object.entries(entries) as [PointCategory, number][]);

describe('planSpendableDebits', () => {
  it('takes everything from the first bucket when it covers the amount', () => {
    expect(planSpendableDebits(wallet({ earned: 10 }), 4)).toEqual([
      { category: 'earned', take: 4 },
    ]);
  });

  it('walks earned → promotional → purchased, draining each in turn', () => {
    const plan = planSpendableDebits(wallet({ earned: 2, promotional: 3, purchased: 10 }), 8);
    expect(plan).toEqual([
      { category: 'earned', take: 2 },
      { category: 'promotional', take: 3 },
      { category: 'purchased', take: 3 },
    ]);
    expect(plan.reduce((sum, d) => sum + d.take, 0)).toBe(8);
  });

  it('skips empty buckets rather than emitting a zero-take row', () => {
    // A zero-take row would write a ledger entry that debits nothing, and
    // the per-bucket idempotency keys make such rows individually visible.
    expect(planSpendableDebits(wallet({ earned: 0, promotional: 5 }), 3)).toEqual([
      { category: 'promotional', take: 3 },
    ]);
  });

  it('stops as soon as the amount is covered', () => {
    expect(planSpendableDebits(wallet({ earned: 5, promotional: 5, purchased: 5 }), 5)).toEqual([
      { category: 'earned', take: 5 },
    ]);
  });

  it('returns an empty plan for a zero amount', () => {
    expect(planSpendableDebits(wallet({ earned: 5 }), 0)).toEqual([]);
  });

  it('ignores a negative balance instead of crediting from it', () => {
    expect(planSpendableDebits(wallet({ earned: -3, promotional: 4 }), 2)).toEqual([
      { category: 'promotional', take: 2 },
    ]);
  });

  it('returns the partial plan when the wallet cannot cover the amount', () => {
    // debitSpendable checks sufficiency against the locked total first, so
    // this shape never reaches production — pinned so a future caller that
    // skips the check gets a partial plan, not a silent over-debit.
    expect(planSpendableDebits(wallet({ earned: 2 }), 5)).toEqual([
      { category: 'earned', take: 2 },
    ]);
  });
});
