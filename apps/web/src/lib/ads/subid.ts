/**
 * Sub-ID tagging — how a click gets attributed back to one creative.
 *
 * An affiliate network reports clicks and commissions per *link*, not per
 * placement, so several creatives pointing at the same merchant collapse into
 * one row and there is no way to tell which card earned the click. Every
 * network solves this with a free-text parameter it echoes back on its own
 * reports; only the parameter name differs. Tagging each outbound URL with the
 * creative's UUID is therefore enough to answer "which creative is working?"
 * without a first-party click table, an interstitial redirect, or an extra
 * network hop that could cost a conversion.
 *
 * Applied at read time (see `getNativeAdCreatives`), not
 * at write time: the admin keeps seeing and editing the exact URL the network
 * gave them, and a creative duplicated in the admin gets its own tag
 * automatically because the tag is its row id.
 *
 * Networks without a known parameter are left untouched — a guessed parameter
 * name is worse than none, because some merchants treat unknown query strings
 * as cache-busting junk or drop them at redirect time.
 *
 * This is also why the admin has no way to delete a creative. The sub-ID *is*
 * the creative's row id, so a line in Awin's report is only readable for as
 * long as that row exists; deleting one turns every historical click it
 * earned into an id that resolves to nothing, and no later report can recover
 * it. Stopping a creative is therefore `is_active = false`, which leaves the
 * row — and the meaning of its id — in place. An uploaded image whose
 * creative is switched off is left in storage; an orphan object costs
 * nothing next to an unreadable report.
 */

/**
 * Sub-ID parameter per affiliate network, keyed by the host that serves the
 * click. The name is the network's own: Awin calls it `clickref`.
 *
 * A one-entry list rather than a constant, because the parameter name is the
 * part that varies between networks — there is no cross-network standard for
 * it. Keeping the lookup keyed by host is what makes adding a second network
 * a new entry instead of a rewrite of {@link withCreativeSubId}.
 */
const SUB_ID_PARAM_BY_NETWORK: ReadonlyArray<{
  matchesHost: (host: string) => boolean;
  param: string;
}> = [
  {
    matchesHost: (host) => host === 'awin1.com' || host.endsWith('.awin1.com'),
    param: 'clickref',
  },
];

function subIdParamFor(href: string): string | null {
  let host: string;
  try {
    host = new URL(href).hostname.toLowerCase();
  } catch {
    // Not an absolute URL. Nothing to tag, and nothing to complain about —
    // href validation is the admin form's job, not this module's.
    return null;
  }
  return SUB_ID_PARAM_BY_NETWORK.find((n) => n.matchesHost(host))?.param ?? null;
}

/**
 * The creative's outbound URL, tagged with its id as the network's sub-ID.
 *
 * Returns `href` unchanged when the network is unknown, when the URL is not
 * absolute, or when the URL already carries that parameter. In practice that
 * last case does not arise: the admin form rejects an `href` that already has
 * a `clickref`, because the one that shows up in real links is the sample
 * value copied along with the link out of Awin's own UI, and letting it stand
 * would attribute every click to that sample instead of to the creative.
 *
 * The parameter is appended to the raw string rather than rebuilt through
 * `URL.searchParams`, which would re-encode the entire query. Awin's
 * `cread.php` carries the real destination in a percent-encoded `ued`
 * parameter, and round-tripping it through `URLSearchParams` rewrites `+` and
 * reserved characters — a rewritten `ued` is a broken affiliate link that
 * still looks right.
 */
export function withCreativeSubId(href: string, creativeId: string): string {
  const param = subIdParamFor(href);
  if (!param) return href;

  const hashAt = href.indexOf('#');
  const base = hashAt === -1 ? href : href.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : href.slice(hashAt);

  if (new RegExp(`[?&]${param}=`).test(base)) return href;

  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${param}=${encodeURIComponent(creativeId)}${hash}`;
}
