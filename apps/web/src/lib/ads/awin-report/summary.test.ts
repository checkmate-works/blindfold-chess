import { describe, expect, it } from 'vitest';

import type { AwinAdvertiserRow, AwinTransaction } from './awin-client';
import { NO_CLICK_REF, buildDailySummary, formatSlackMessage } from './summary';

function advertiserRow(overrides: Partial<AwinAdvertiserRow> = {}): AwinAdvertiserRow {
  return {
    advertiserId: 90609,
    advertiserName: 'Forward Chess',
    publisherId: 2801536,
    region: 'US',
    currency: 'USD',
    impressions: 0,
    clicks: 12,
    pendingNo: 0,
    pendingValue: 0,
    pendingComm: 0,
    confirmedNo: 0,
    confirmedValue: 0,
    confirmedComm: 0,
    bonusNo: 0,
    bonusValue: 0,
    bonusComm: 0,
    declinedNo: 0,
    declinedValue: 0,
    declinedComm: 0,
    totalNo: 0,
    totalValue: 0,
    totalComm: 0,
    ...overrides,
  };
}

function transaction(clickRef: string | null | undefined, status = 'pending'): AwinTransaction {
  return {
    id: Math.floor(Math.random() * 1e9),
    commissionStatus: status,
    clickRefs: clickRef === undefined ? null : { clickRef },
  };
}

const base = {
  reportDate: '2026-10-01',
  timezone: 'UTC',
  publisherId: '2801536',
  region: 'US',
  transactionsFrom: '2026-09-25',
};

describe('buildDailySummary', () => {
  it('sums clicks and impressions across advertisers', () => {
    const summary = buildDailySummary({
      ...base,
      advertiserRows: [
        advertiserRow({ clicks: 12, impressions: 1 }),
        advertiserRow({ advertiserId: 1, advertiserName: 'Other', clicks: 3, impressions: 2 }),
      ],
      transactions: [],
    });
    expect(summary.clicks).toBe(15);
    expect(summary.impressions).toBe(3);
    expect(summary.advertisers.map((a) => a.advertiserName)).toEqual(['Forward Chess', 'Other']);
  });

  it('counts transactions by clickRef, grouping the ones without one', () => {
    const summary = buildDailySummary({
      ...base,
      advertiserRows: [],
      transactions: [
        transaction('creative-a'),
        transaction('creative-a', 'approved'),
        transaction('creative-b'),
        transaction(null),
        transaction(undefined),
        transaction(''),
      ],
    });
    expect(summary.transactionCount).toBe(6);
    expect(summary.byClickRef).toEqual([
      { clickRef: 'creative-a', count: 2 },
      { clickRef: 'creative-b', count: 1 },
      { clickRef: NO_CLICK_REF, count: 3 },
    ]);
  });
});

describe('formatSlackMessage', () => {
  it('renders the layout settled from the probe run', () => {
    const summary = buildDailySummary({
      ...base,
      advertiserRows: [advertiserRow()],
      transactions: [],
    });
    expect(formatSlackMessage(summary)).toBe(
      [
        '*Awin daily report — 2026-10-01 (UTC)*',
        '',
        'publisher 2801536 · region US',
        '• clicks *12* · impressions 0',
        '    Forward Chess: 12 clicks, 0 pending / 0 confirmed / 0 declined, 0 USD',
        '• transactions 2026-09-25..2026-10-01: 0',
      ].join('\n')
    );
  });

  it('says so when the day had no advertiser rows, and lists clickRefs when there are any', () => {
    const summary = buildDailySummary({
      ...base,
      advertiserRows: [],
      transactions: [transaction('creative-a'), transaction('creative-a')],
    });
    const text = formatSlackMessage(summary);
    expect(text).toContain('• no advertiser rows for this day');
    expect(text).not.toContain('• clicks');
    expect(text).toContain('• transactions 2026-09-25..2026-10-01: 2');
    expect(text).toContain('    clickRef creative-a: 2');
  });
});
