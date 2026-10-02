import { type AwinClientConfig, fetchAdvertiserReport, fetchTransactions } from './awin-client';
import { postSlackMessage } from './slack';
import { buildDailySummary, formatSlackMessage } from './summary';

/**
 * The daily Awin → Slack report: yesterday's clicks and the trailing week's
 * transactions, posted to the affiliate channel.
 *
 * @description
 * Replaces logging into the Awin dashboard each morning. Native ad cards
 * carry the creative id as Awin's `clickref`, and this report is where that
 * attribution surfaces without a browser: clicks per advertiser for the day,
 * and the week's transactions summed by clickRef.
 *
 * @design Days are UTC days
 *
 * Awin's report endpoints accept a fixed list of timezones with no Asian
 * zone in it, and there is no finer grain than a day, so a JST day cannot be
 * assembled from the API. The report takes the UTC day that ended most
 * recently. The dashboard shows the same numbers when its report timezone
 * is set to UTC; verified against it on 2026-10-02 (12 clicks both sides).
 *
 * @design Configuration is fixed, not discovered
 *
 * The publisher id and region are read from the environment and the run
 * fails loudly when any is missing. Discovering them (listing accounts,
 * trying each documented region) costs up to twenty-one calls against a
 * twenty-per-minute limit, and is a one-time job — `scripts/awin-check.ts`
 * does it, prints the values to pin, and is the place to re-run if Awin
 * moves the account.
 *
 * @design The transaction window
 *
 * Seven days ending on the report day. Transactions are sparse enough that
 * a single day is usually empty and reads as a failure; a week gives the
 * clickRef breakdown something to show. Each day's report overlaps the
 * previous one's by design — it is a running view, not a ledger.
 */
export interface AwinDailyReportConfig {
  token: string;
  publisherId: string;
  region: string;
  slackWebhookUrl: string;
}

export const AWIN_REPORT_TIMEZONE = 'UTC';

export const TRANSACTION_WINDOW_DAYS = 7;

const ENV_NAMES = {
  token: 'AWIN_API_TOKEN',
  publisherId: 'AWIN_PUBLISHER_ID',
  region: 'AWIN_REGION',
  slackWebhookUrl: 'AWIN_REPORT_SLACK_WEBHOOK_URL',
} as const satisfies Record<keyof AwinDailyReportConfig, string>;

/**
 * Reads the four variables, naming every missing one in a single error so
 * a half-configured deployment is fixed in one round trip rather than one
 * variable per failed run.
 */
export function readAwinDailyReportConfig(
  env: Record<string, string | undefined> = process.env
): AwinDailyReportConfig {
  const missing = (Object.values(ENV_NAMES) as string[]).filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`Awin daily report is not configured: ${missing.join(', ')} not set`);
  }
  return {
    token: env[ENV_NAMES.token] as string,
    publisherId: env[ENV_NAMES.publisherId] as string,
    region: env[ENV_NAMES.region] as string,
    slackWebhookUrl: env[ENV_NAMES.slackWebhookUrl] as string,
  };
}

/** `yyyy-MM-dd` of `instant` in UTC. */
export function utcDate(instant: Date): string {
  return instant.toISOString().slice(0, 10);
}

/** `ymd` moved by `days` calendar days, in UTC. */
export function shiftDate(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export interface AwinDailyReportResult {
  reportDate: string;
  clicks: number;
  impressions: number;
  transactionCount: number;
}

export async function runAwinDailyReport(options: {
  config?: AwinDailyReportConfig;
  now?: Date;
}): Promise<AwinDailyReportResult> {
  const config = options.config ?? readAwinDailyReportConfig();
  const now = options.now ?? new Date();

  const reportDate = shiftDate(utcDate(now), -1);
  const transactionsFrom = shiftDate(reportDate, -(TRANSACTION_WINDOW_DAYS - 1));

  const client: AwinClientConfig = {
    token: config.token,
    publisherId: config.publisherId,
    region: config.region,
    timezone: AWIN_REPORT_TIMEZONE,
  };

  const [advertiserRows, transactions] = await Promise.all([
    fetchAdvertiserReport(client, { startDate: reportDate, endDate: reportDate }),
    fetchTransactions(client, { startDate: transactionsFrom, endDate: reportDate }),
  ]);

  const summary = buildDailySummary({
    reportDate,
    timezone: AWIN_REPORT_TIMEZONE,
    publisherId: config.publisherId,
    region: config.region,
    advertiserRows,
    transactionsFrom,
    transactions,
  });

  await postSlackMessage(config.slackWebhookUrl, formatSlackMessage(summary));

  return {
    reportDate,
    clicks: summary.clicks,
    impressions: summary.impressions,
    transactionCount: summary.transactionCount,
  };
}
