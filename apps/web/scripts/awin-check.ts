/**
 * One-off probe of the Awin Publisher API, run by hand before any daily
 * report is built on it.
 *
 * The daily Slack report needs three things from the API that the docs do
 * not pin down for this account: which publisher account the token can see,
 * which `region` value the report endpoints accept for it (the documented
 * list has no JP), and whether the click counts the API returns for a day
 * match what the dashboard shows for the same day. This script answers all
 * three in one run so the comparison can be done by eye against the
 * dashboard, and so the numbers the eventual cron job would post are seen
 * once before anyone trusts them.
 *
 * What it does, in order:
 *
 * 1. `GET /accounts` — lists every account the token reaches, and picks
 *    the publisher ones (or the one named by `AWIN_PUBLISHER_ID`).
 * 2. `GET /publishers/{id}/reports/advertiser` for one day. With
 *    `AWIN_REGION` unset it tries each documented region in turn and stops
 *    at the first that returns rows, because the endpoint requires a region
 *    and the dashboard does not say which one the account lives in.
 * 3. `GET /publishers/{id}/transactions/` for the trailing week, summed by
 *    `clickRef`. The creative row id goes out as `clickref` on every link
 *    (see `src/lib/ads/subid.ts`), so this is the only place the API shows
 *    per-creative attribution — and it only covers transactions, not clicks.
 *
 * Environment (loaded from `.env.local` / `.env` in `apps/web`, like the
 * other scripts here):
 *
 * - `AWIN_API_TOKEN` (required) — personal token from
 *   https://ui.awin.com/awin-api. It is read into memory and never printed;
 *   every line of output passes through {@link redact} so an echoed error
 *   body cannot leak it either.
 * - `AWIN_PUBLISHER_ID` — skip account discovery and probe this id only.
 * - `AWIN_REGION` — skip region discovery and use this value.
 * - `AWIN_TIMEZONE` — timezone for the report window; defaults to `UTC`.
 *   The report endpoints accept only a fixed list of zones and there is no
 *   Asian one in it (`Asia/Tokyo` is rejected with HTTP 400
 *   `invalid timezone name`; observed 2026-10-02): `UTC`, `Europe/London`,
 *   `Europe/Dublin`, `Europe/Paris`, `Europe/Berlin`, `Europe/Helsinki`,
 *   `America/Sao_Paulo`, `Australia/Sydney`, `Canada/{Eastern,Central,
 *   Mountain,Pacific}`, `US/{Eastern,Central,Mountain,Pacific}`. Compare
 *   against the dashboard with its report timezone set to the same value.
 * - `AWIN_DATE` — `yyyy-MM-dd` to report on; defaults to yesterday in
 *   `AWIN_TIMEZONE`.
 *
 * Rate limit is 20 calls per minute per user. Region discovery is the only
 * loop, and it is capped at the 20 documented regions, so a single run
 * stays within budget; a 429 is honoured via `Retry-After` regardless.
 *
 * Run from the repo root: `pnpm --filter web awin:check`
 */
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'] });

const BASE_URL = 'https://api.awin.com';

/** Regions the report endpoints document as accepted values, in doc order. */
const DOCUMENTED_REGIONS = [
  'AT',
  'AU',
  'BE',
  'BR',
  'BU',
  'CA',
  'CH',
  'DE',
  'DK',
  'ES',
  'FI',
  'FR',
  'GB',
  'IE',
  'IT',
  'NL',
  'NO',
  'PL',
  'SE',
  'US',
] as const;

const token = process.env.AWIN_API_TOKEN;
if (!token) {
  console.error('AWIN_API_TOKEN is not set. Add it to apps/web/.env.local and rerun.');
  process.exit(1);
}

/**
 * Replaces the token wherever it might appear in text that is about to be
 * printed. This is not a precaution: on a 401, Awin's error body is
 * `{"error":"invalid_token","description":"<the token you sent>"}`, so a
 * script that prints the response of a failed call prints the credential
 * (observed 2026-10-02 with a deliberately bad token). Every line of output
 * goes through here so a future `console.log` of a body cannot bypass it.
 */
function redact(text: string): string {
  return text.split(token as string).join('***');
}

function log(...parts: unknown[]): void {
  console.log(...parts.map((p) => (typeof p === 'string' ? redact(p) : p)));
}

type JsonValue = unknown;

interface ApiResult {
  status: number;
  body: JsonValue;
  rawText: string;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function awinGet(path: string, query: Record<string, string> = {}): Promise<ApiResult> {
  const url = new URL(path, BASE_URL);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

  for (;;) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after') ?? '5');
      log(`  429 from ${url.pathname}; waiting ${retryAfter}s`);
      await sleep(retryAfter * 1000);
      continue;
    }
    const rawText = await res.text();
    let body: JsonValue = null;
    try {
      body = rawText ? JSON.parse(rawText) : null;
    } catch {
      body = null;
    }
    return { status: res.status, body, rawText };
  }
}

function describeFailure(path: string, result: ApiResult): string {
  const snippet = result.rawText.slice(0, 300).replace(/\s+/g, ' ');
  return `${path} -> HTTP ${result.status}${snippet ? `: ${snippet}` : ''}`;
}

/** `yyyy-MM-dd` for the calendar day in `timeZone` that `instant` falls on. */
function dateInZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function shiftDate(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().slice(0, 10);
}

interface Account {
  accountId: number | string;
  accountName?: string;
  accountType?: string;
  userRole?: string;
}

function asAccounts(body: JsonValue): Account[] {
  const list = Array.isArray(body)
    ? body
    : body && typeof body === 'object' && Array.isArray((body as { accounts?: unknown }).accounts)
      ? (body as { accounts: unknown[] }).accounts
      : [];
  return list.filter(
    (a): a is Account => !!a && typeof a === 'object' && 'accountId' in (a as object)
  );
}

type Row = Record<string, unknown>;

function num(row: Row, key: string): number {
  const v = row[key];
  return typeof v === 'number' ? v : Number(v ?? 0) || 0;
}

function printAdvertiserReport(rows: Row[]): void {
  const table = rows.map((r) => ({
    advertiser: `${String(r.advertiserName ?? '')} (${String(r.advertiserId ?? '')})`,
    impressions: num(r, 'impressions'),
    clicks: num(r, 'clicks'),
    pending: num(r, 'pendingNo'),
    confirmed: num(r, 'confirmedNo'),
    declined: num(r, 'declinedNo'),
    totalComm: num(r, 'totalComm'),
    currency: String(r.currency ?? ''),
  }));
  console.table(table);
  const total = table.reduce(
    (acc, r) => ({
      impressions: acc.impressions + r.impressions,
      clicks: acc.clicks + r.clicks,
      pending: acc.pending + r.pending,
      confirmed: acc.confirmed + r.confirmed,
      declined: acc.declined + r.declined,
      totalComm: acc.totalComm + r.totalComm,
    }),
    { impressions: 0, clicks: 0, pending: 0, confirmed: 0, declined: 0, totalComm: 0 }
  );
  log('  totals:', total);
}

function clickRefOf(t: Row): string {
  const refs = t.clickRefs;
  if (refs && typeof refs === 'object') {
    const v = (refs as Row).clickRef;
    if (typeof v === 'string' && v) return v;
  }
  const flat = t.clickRef;
  return typeof flat === 'string' && flat ? flat : '(none)';
}

function printTransactionsByClickRef(transactions: Row[]): void {
  const byRef = new Map<
    string,
    { count: number; byStatus: Record<string, number>; comm: number }
  >();
  for (const t of transactions) {
    const ref = clickRefOf(t);
    const entry = byRef.get(ref) ?? { count: 0, byStatus: {}, comm: 0 };
    entry.count += 1;
    const status = String(t.commissionStatus ?? 'unknown');
    entry.byStatus[status] = (entry.byStatus[status] ?? 0) + 1;
    const comm = t.commissionAmount;
    if (comm && typeof comm === 'object') entry.comm += num(comm as Row, 'amount');
    byRef.set(ref, entry);
  }
  if (byRef.size === 0) {
    log('  no transactions in the window');
    return;
  }
  console.table(
    [...byRef.entries()].map(([clickRef, e]) => ({
      clickRef,
      transactions: e.count,
      status: Object.entries(e.byStatus)
        .map(([s, n]) => `${s}:${n}`)
        .join(' '),
      commission: e.comm,
    }))
  );
}

async function main(): Promise<void> {
  const timezone = process.env.AWIN_TIMEZONE ?? 'UTC';
  const reportDate = process.env.AWIN_DATE ?? shiftDate(dateInZone(new Date(), timezone), -1);
  log(`Report day: ${reportDate} (${timezone})`);

  // 1. Accounts
  log('\n[1/3] GET /accounts');
  const accounts = await awinGet('/accounts');
  if (accounts.status !== 200) {
    throw new Error(describeFailure('/accounts', accounts));
  }
  const all = asAccounts(accounts.body);
  console.table(
    all.map((a) => ({
      accountId: a.accountId,
      name: a.accountName ?? '',
      type: a.accountType ?? '',
      role: a.userRole ?? '',
    }))
  );

  const configuredId = process.env.AWIN_PUBLISHER_ID;
  const publisherIds = configuredId
    ? [configuredId]
    : all
        .filter((a) => String(a.accountType ?? '').toLowerCase() === 'publisher')
        .map((a) => String(a.accountId));
  if (publisherIds.length === 0) {
    throw new Error(
      'No publisher account found for this token. Set AWIN_PUBLISHER_ID if the account list above is empty or unexpected.'
    );
  }

  for (const publisherId of publisherIds) {
    log(`\n=== publisher ${publisherId} ===`);

    // 2. Advertiser report for one day, discovering the region if needed
    log(`\n[2/3] GET /publishers/${publisherId}/reports/advertiser  ${reportDate}`);
    const regions = process.env.AWIN_REGION ? [process.env.AWIN_REGION] : [...DOCUMENTED_REGIONS];
    let found: { region: string; rows: Row[] } | null = null;
    const emptyRegions: string[] = [];
    for (const region of regions) {
      const path = `/publishers/${publisherId}/reports/advertiser`;
      const result = await awinGet(path, {
        startDate: reportDate,
        endDate: reportDate,
        timezone,
        region,
      });
      if (result.status !== 200) {
        log(`  region=${region}: ${describeFailure(path, result)}`);
        // A 400 that does not mention the region is about some other
        // parameter (a timezone outside Awin's list, a malformed date) and
        // every remaining region would fail the same way. Stop rather than
        // spend the rest of the rate-limit budget on identical errors.
        if (result.status === 400 && !/region/i.test(result.rawText)) {
          log('  this error is not about the region; fix the parameter above and rerun.');
          break;
        }
        continue;
      }
      const rows = Array.isArray(result.body) ? (result.body as Row[]) : [];
      if (rows.length === 0) {
        emptyRegions.push(region);
        continue;
      }
      found = { region, rows };
      break;
    }
    if (emptyRegions.length > 0) log(`  empty for region(s): ${emptyRegions.join(', ')}`);
    if (!found) {
      log('  no region returned rows for this day. Either the day had no activity or the account');
      log(
        '  uses a region outside the documented list; set AWIN_REGION and/or AWIN_DATE and rerun.'
      );
    } else {
      log(`  region=${found.region} returned ${found.rows.length} advertiser row(s):`);
      printAdvertiserReport(found.rows);
      log(`  -> Set AWIN_REGION=${found.region} to skip discovery next time.`);
    }

    // 3. Transactions for the trailing week, summed by clickRef
    const txStart = shiftDate(reportDate, -6);
    log(`\n[3/3] GET /publishers/${publisherId}/transactions/  ${txStart}..${reportDate}`);
    const txPath = `/publishers/${publisherId}/transactions/`;
    const tx = await awinGet(txPath, {
      startDate: `${txStart}T00:00:00`,
      endDate: `${reportDate}T23:59:59`,
      timezone,
    });
    if (tx.status !== 200) {
      log(`  ${describeFailure(txPath, tx)}`);
    } else {
      const transactions = Array.isArray(tx.body) ? (tx.body as Row[]) : [];
      log(`  ${transactions.length} transaction(s); by clickRef (= ad_creatives.id):`);
      printTransactionsByClickRef(transactions);
    }
  }

  log('\nCompare the [2/3] clicks/impressions against the dashboard for the same day and');
  log('timezone. A match means the daily report can be built on reports/advertiser as is.');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(redact(message));
  process.exit(1);
});
