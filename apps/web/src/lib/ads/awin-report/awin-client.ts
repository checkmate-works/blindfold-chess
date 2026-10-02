/**
 * The two Awin Publisher API calls the daily report needs, and nothing else.
 *
 * Awin's API is `https://api.awin.com`, Bearer-authenticated with a personal
 * token issued at https://ui.awin.com/awin-api. The token is bound to the
 * user, not the account, and reaches every account that user can open, so it
 * is handled as a credential throughout: it goes into one header and into no
 * error message. That last point is not caution for its own sake — on a 401
 * Awin's body is `{"error":"invalid_token","description":"<the token>"}`,
 * which is why {@link awinGet} never quotes a response body in the error it
 * throws (observed 2026-10-02 against a deliberately bad token).
 *
 * Rate limit is 20 calls per minute per user. The report makes two calls a
 * day, so a 429 can only come from someone else using the same token at the
 * same moment (the hand-run probe in `scripts/awin-check.ts`, say); it is
 * retried once after `Retry-After`, capped so a Vercel function does not sit
 * idle past its budget.
 */

const BASE_URL = 'https://api.awin.com';

const MAX_RETRY_AFTER_MS = 20_000;

export interface AwinClientConfig {
  token: string;
  publisherId: string;
  /**
   * Required by the report endpoints, and not derivable from the account:
   * the documented list is twenty two-letter codes with no `JP` in it, and
   * this publisher's rows turned up under `US`. Found once with
   * `scripts/awin-check.ts`, then pinned in the environment.
   */
  region: string;
  /**
   * One of Awin's fixed list — `UTC`, five European zones, `America/Sao_Paulo`,
   * `Australia/Sydney`, and the four `Canada/*` and `US/*` zones. There is no
   * Asian zone; `Asia/Tokyo` is a 400. The report runs on `UTC` days.
   */
  timezone: string;
}

export interface AwinAdvertiserRow {
  advertiserId: number;
  advertiserName: string;
  publisherId: number;
  region: string;
  currency: string;
  impressions: number;
  clicks: number;
  pendingNo: number;
  pendingValue: number;
  pendingComm: number;
  confirmedNo: number;
  confirmedValue: number;
  confirmedComm: number;
  bonusNo: number;
  bonusValue: number;
  bonusComm: number;
  declinedNo: number;
  declinedValue: number;
  declinedComm: number;
  totalNo: number;
  totalValue: number;
  totalComm: number;
}

export interface AwinTransaction {
  id: number;
  advertiserId?: number;
  commissionStatus: string;
  commissionAmount?: { amount: number; currency: string };
  saleAmount?: { amount: number; currency: string };
  clickDate?: string;
  transactionDate?: string;
  /**
   * `clickRef` is what this app sends as `clickref` on every outbound link:
   * the `ad_creatives` row id (see `src/lib/ads/subid.ts`). It is the only
   * per-creative attribution the API offers — clicks are not broken down by
   * it, only transactions carry it.
   */
  clickRefs?: {
    clickRef?: string | null;
    clickRef2?: string | null;
    clickRef3?: string | null;
    clickRef4?: string | null;
    clickRef5?: string | null;
    clickRef6?: string | null;
  } | null;
}

export interface DateRange {
  /** `yyyy-MM-dd`, inclusive. */
  startDate: string;
  /** `yyyy-MM-dd`, inclusive. */
  endDate: string;
}

export class AwinApiError extends Error {
  constructor(
    readonly path: string,
    readonly status: number,
    /** Awin's `error` field when the body was JSON with one; never the body. */
    readonly code: string | null
  ) {
    super(`Awin ${path} -> HTTP ${status}${code ? ` (${code})` : ''}`);
    this.name = 'AwinApiError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorCodeOf(text: string): string | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && 'error' in parsed) {
      const code = (parsed as { error: unknown }).error;
      return typeof code === 'string' ? code : null;
    }
  } catch {
    // Not JSON; there is no code to report.
  }
  return null;
}

async function awinGet<T>(
  config: AwinClientConfig,
  path: string,
  query: Record<string, string>
): Promise<T> {
  const url = new URL(path, BASE_URL);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);

  let retried = false;
  for (;;) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${config.token}`, Accept: 'application/json' },
    });
    if (res.status === 429 && !retried) {
      retried = true;
      const retryAfterSeconds = Number(res.headers.get('retry-after') ?? '5');
      await sleep(Math.min(retryAfterSeconds * 1000, MAX_RETRY_AFTER_MS));
      continue;
    }
    const text = await res.text();
    if (!res.ok) {
      throw new AwinApiError(path, res.status, errorCodeOf(text));
    }
    return JSON.parse(text) as T;
  }
}

/**
 * `GET /publishers/{id}/reports/advertiser`: one row per advertiser with
 * clicks, impressions and transaction counts/amounts by commission status,
 * aggregated over the whole range. Impressions are zero for this app's
 * native cards — they are rendered first-party and never load an Awin
 * tag — so clicks are the number that matters.
 */
export async function fetchAdvertiserReport(
  config: AwinClientConfig,
  range: DateRange
): Promise<AwinAdvertiserRow[]> {
  const rows = await awinGet<unknown>(
    config,
    `/publishers/${config.publisherId}/reports/advertiser`,
    {
      startDate: range.startDate,
      endDate: range.endDate,
      timezone: config.timezone,
      region: config.region,
    }
  );
  return Array.isArray(rows) ? (rows as AwinAdvertiserRow[]) : [];
}

/**
 * `GET /publishers/{id}/transactions/`: individual transactions in the range,
 * each carrying its `clickRefs`. The endpoint caps a range at 31 days; the
 * report asks for one week.
 */
export async function fetchTransactions(
  config: AwinClientConfig,
  range: DateRange
): Promise<AwinTransaction[]> {
  const rows = await awinGet<unknown>(config, `/publishers/${config.publisherId}/transactions/`, {
    startDate: `${range.startDate}T00:00:00`,
    endDate: `${range.endDate}T23:59:59`,
    timezone: config.timezone,
  });
  return Array.isArray(rows) ? (rows as AwinTransaction[]) : [];
}
