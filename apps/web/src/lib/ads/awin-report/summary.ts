import type { AwinAdvertiserRow, AwinTransaction } from './awin-client';

/**
 * What one day's report says, reduced from Awin's rows to the numbers the
 * Slack message shows. Pure data so the message can be unit-tested and so
 * the hand-run probe (`scripts/awin-check.ts`) can post the same message
 * the cron does.
 */
export interface DailySummary {
  /** `yyyy-MM-dd` of the day reported on. */
  reportDate: string;
  timezone: string;
  publisherId: string;
  region: string;
  clicks: number;
  impressions: number;
  advertisers: AdvertiserSummary[];
  /** `yyyy-MM-dd` start of the transaction window; the end is `reportDate`. */
  transactionsFrom: string;
  transactionCount: number;
  byClickRef: ClickRefCount[];
}

export interface AdvertiserSummary {
  advertiserId: number;
  advertiserName: string;
  clicks: number;
  pending: number;
  confirmed: number;
  declined: number;
  totalComm: number;
  currency: string;
}

export interface ClickRefCount {
  /** `(none)` when the transaction carried no clickRef. */
  clickRef: string;
  count: number;
}

export const NO_CLICK_REF = '(none)';

function clickRefOf(t: AwinTransaction): string {
  const ref = t.clickRefs?.clickRef;
  return typeof ref === 'string' && ref !== '' ? ref : NO_CLICK_REF;
}

export function buildDailySummary(input: {
  reportDate: string;
  timezone: string;
  publisherId: string;
  region: string;
  advertiserRows: AwinAdvertiserRow[];
  transactionsFrom: string;
  transactions: AwinTransaction[];
}): DailySummary {
  const advertisers = input.advertiserRows.map<AdvertiserSummary>((r) => ({
    advertiserId: r.advertiserId,
    advertiserName: r.advertiserName,
    clicks: r.clicks ?? 0,
    pending: r.pendingNo ?? 0,
    confirmed: r.confirmedNo ?? 0,
    declined: r.declinedNo ?? 0,
    totalComm: r.totalComm ?? 0,
    currency: r.currency ?? '',
  }));

  const counts = new Map<string, number>();
  for (const t of input.transactions) {
    const ref = clickRefOf(t);
    counts.set(ref, (counts.get(ref) ?? 0) + 1);
  }

  return {
    reportDate: input.reportDate,
    timezone: input.timezone,
    publisherId: input.publisherId,
    region: input.region,
    clicks: input.advertiserRows.reduce((n, r) => n + (r.clicks ?? 0), 0),
    impressions: input.advertiserRows.reduce((n, r) => n + (r.impressions ?? 0), 0),
    advertisers,
    transactionsFrom: input.transactionsFrom,
    transactionCount: input.transactions.length,
    byClickRef: [...counts].map(([clickRef, count]) => ({ clickRef, count })),
  };
}

/**
 * The Slack message as mrkdwn `text`. Plain text rather than Block Kit so
 * the same string reads correctly in a notification preview and on mobile,
 * where blocks collapse unpredictably. The layout was settled by posting it
 * from the probe and looking at it in the channel; change it here and both
 * the cron and the probe follow.
 */
export function formatSlackMessage(s: DailySummary): string {
  const lines: string[] = [`*Awin daily report — ${s.reportDate} (${s.timezone})*`];
  lines.push('');
  lines.push(`publisher ${s.publisherId} · region ${s.region}`);
  if (s.advertisers.length === 0) {
    lines.push('• no advertiser rows for this day');
  } else {
    lines.push(`• clicks *${s.clicks}* · impressions ${s.impressions}`);
    for (const a of s.advertisers) {
      lines.push(
        `    ${a.advertiserName}: ${a.clicks} clicks, ` +
          `${a.pending} pending / ${a.confirmed} confirmed / ${a.declined} declined, ` +
          `${a.totalComm} ${a.currency}`
      );
    }
  }
  lines.push(`• transactions ${s.transactionsFrom}..${s.reportDate}: ${s.transactionCount}`);
  for (const { clickRef, count } of s.byClickRef) {
    lines.push(`    clickRef ${clickRef}: ${count}`);
  }
  return lines.join('\n');
}
