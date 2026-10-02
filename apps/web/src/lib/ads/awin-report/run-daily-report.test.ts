import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type AwinDailyReportConfig,
  readAwinDailyReportConfig,
  runAwinDailyReport,
  shiftDate,
  utcDate,
} from './run-daily-report';

const config: AwinDailyReportConfig = {
  token: 'tok-SECRET-123',
  publisherId: '2801536',
  region: 'US',
  slackWebhookUrl: 'https://hooks.slack.com/services/T0/B0/SECRET-PATH',
};

/** 2026-10-02 11:00 JST — the cron's slot, two hours into the next UTC day. */
const NOW = new Date('2026-10-02T02:00:00Z');

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('readAwinDailyReportConfig', () => {
  it('names every missing variable in one error', () => {
    expect(() => readAwinDailyReportConfig({ AWIN_API_TOKEN: 'x' })).toThrow(
      'AWIN_PUBLISHER_ID, AWIN_REGION, AWIN_REPORT_SLACK_WEBHOOK_URL not set'
    );
  });

  it('treats an empty string as unset', () => {
    expect(() =>
      readAwinDailyReportConfig({
        AWIN_API_TOKEN: 'x',
        AWIN_PUBLISHER_ID: '1',
        AWIN_REGION: '',
        AWIN_REPORT_SLACK_WEBHOOK_URL: 'https://hooks.slack.com/x',
      })
    ).toThrow('AWIN_REGION not set');
  });
});

describe('date helpers', () => {
  it('take the UTC calendar day, not the local one', () => {
    expect(utcDate(new Date('2026-10-01T23:30:00Z'))).toBe('2026-10-01');
    expect(utcDate(new Date('2026-10-02T00:30:00Z'))).toBe('2026-10-02');
  });

  it('shift across month and year boundaries', () => {
    expect(shiftDate('2026-10-01', -1)).toBe('2026-09-30');
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDate('2026-10-01', -6)).toBe('2026-09-25');
  });
});

describe('runAwinDailyReport', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function requestedUrls(): URL[] {
    return fetchMock.mock.calls.map(([input]) => new URL(String(input)));
  }

  it('asks Awin for yesterday (UTC) and the trailing week, then posts the message', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/reports/advertiser')) {
        return jsonResponse([
          {
            advertiserId: 90609,
            advertiserName: 'Forward Chess',
            clicks: 12,
            impressions: 0,
            currency: 'USD',
          },
        ]);
      }
      if (url.pathname.endsWith('/transactions/')) {
        return jsonResponse([
          { id: 1, commissionStatus: 'pending', clickRefs: { clickRef: 'c-1' } },
        ]);
      }
      if (url.hostname === 'hooks.slack.com') {
        return new Response('ok', { status: 200 });
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const result = await runAwinDailyReport({ config, now: NOW });

    expect(result).toEqual({
      reportDate: '2026-10-01',
      clicks: 12,
      impressions: 0,
      transactionCount: 1,
    });

    const [advertiser, transactions, slack] = requestedUrls();
    expect(advertiser.pathname).toBe('/publishers/2801536/reports/advertiser');
    expect(Object.fromEntries(advertiser.searchParams)).toEqual({
      startDate: '2026-10-01',
      endDate: '2026-10-01',
      timezone: 'UTC',
      region: 'US',
    });
    expect(transactions.pathname).toBe('/publishers/2801536/transactions/');
    expect(Object.fromEntries(transactions.searchParams)).toEqual({
      startDate: '2026-09-25T00:00:00',
      endDate: '2026-10-01T23:59:59',
      timezone: 'UTC',
    });
    expect(slack.href).toBe(config.slackWebhookUrl);

    const awinHeaders = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(awinHeaders.get('authorization')).toBe('Bearer tok-SECRET-123');

    const slackInit = fetchMock.mock.calls[2][1];
    expect(slackInit?.method).toBe('POST');
    const payload = JSON.parse(String(slackInit?.body)) as { text: string };
    expect(payload.text).toContain('*Awin daily report — 2026-10-01 (UTC)*');
    expect(payload.text).toContain('Forward Chess: 12 clicks');
    expect(payload.text).toContain('clickRef c-1: 1');
  });

  it('fails on an Awin error without echoing the token, and does not post', async () => {
    // Awin's 401 body quotes the token back; the thrown error must not.
    fetchMock.mockImplementation(async () =>
      jsonResponse({ error: 'invalid_token', description: 'tok-SECRET-123' }, 401)
    );

    await expect(runAwinDailyReport({ config, now: NOW })).rejects.toMatchObject({
      name: 'AwinApiError',
      status: 401,
      code: 'invalid_token',
      message: expect.not.stringContaining('SECRET'),
    });
    expect(requestedUrls().some((u) => u.hostname === 'hooks.slack.com')).toBe(false);
  });

  it('retries once on 429 after Retry-After', async () => {
    vi.useFakeTimers();
    try {
      let advertiserCalls = 0;
      fetchMock.mockImplementation(async (input) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith('/reports/advertiser')) {
          advertiserCalls += 1;
          if (advertiserCalls === 1) {
            return new Response('', { status: 429, headers: { 'retry-after': '1' } });
          }
          return jsonResponse([]);
        }
        if (url.pathname.endsWith('/transactions/')) return jsonResponse([]);
        return new Response('ok', { status: 200 });
      });

      const run = runAwinDailyReport({ config, now: NOW });
      await vi.advanceTimersByTimeAsync(1000);
      const result = await run;

      expect(advertiserCalls).toBe(2);
      expect(result.clicks).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('surfaces a rejected webhook by status and reason, never by URL', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.hostname === 'hooks.slack.com') return new Response('no_service', { status: 404 });
      return jsonResponse([]);
    });

    await expect(runAwinDailyReport({ config, now: NOW })).rejects.toMatchObject({
      name: 'SlackWebhookError',
      status: 404,
      reason: 'no_service',
      message: expect.not.stringContaining('SECRET-PATH'),
    });
  });
});
