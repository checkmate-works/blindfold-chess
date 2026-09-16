import { isInternalUrl } from './linkify-urls';

/**
 * Where a candidate href points, once it is known to be renderable.
 *
 * - `internal` — stays on this site: a same-site absolute URL, or (only when
 *   the caller opts in) a site-relative path / fragment.
 * - `external` — an absolute `http:` / `https:` URL on another host.
 * - `unsafe` — must NOT be rendered as a link at all. Callers drop the anchor
 *   and render the text inert, or reject the input outright.
 */
export type LinkTarget = 'internal' | 'external' | 'unsafe';

/**
 * Upper bound on an href we are willing to render or persist.
 *
 * 2048 is the practical ceiling for a URL that browsers, proxies, and server
 * logs handle intact; past it the value is far more likely to be a payload
 * than a link someone means to follow. The cap lives here rather than in each
 * caller so a length rejected by the admin ad form is also rejected when the
 * same string arrives through rendered rich text.
 */
export const MAX_LINK_HREF_LENGTH = 2048;

type ClassifyOptions = {
  /**
   * Accept a root-relative path (`/learn`) or a fragment (`#section`) as
   * `internal`. Off by default: a surface that stores a bare destination — an
   * ad's click-through, the URL behind the `/redirect` interstitial, a PGN
   * `[Site]` header — wants an absolute URL, and silently accepting a relative
   * one there widens what may be written, not just what may be linked. Rich
   * text authored in the editor is the case that needs it, because in-article
   * links to our own pages are written as paths.
   */
  allowSiteRelative?: boolean;
};

/**
 * Base used only to resolve a candidate site-relative href. The `.invalid`
 * TLD is reserved and can never be a real host, so a resolution that still
 * lands on this origin proves the href never escaped the current site —
 * regardless of how the string spells the escape.
 */
const RELATIVE_BASE_ORIGIN = 'https://site-relative.invalid';

/**
 * Whether `href` resolves within the current site when treated as relative.
 *
 * A leading `/` or `#` is what an author means by "a link into our own site",
 * but that prefix alone does not establish it. `//evil.example/x` starts with
 * `/` and is a protocol-relative URL that resolves against the page's scheme
 * and navigates off-site; so does `/\evil.example/x`, because the URL parser
 * folds `\` into `/` for http(s); and so does an href with a tab or newline
 * between the slashes, because the parser strips those characters before
 * parsing. Rather than enumerate the spellings, resolve the string with the
 * same parser the browser uses and require the origin to come back unchanged.
 */
function isSiteRelative(href: string): boolean {
  if (!href.startsWith('/') && !href.startsWith('#')) return false;
  try {
    return new URL(href, RELATIVE_BASE_ORIGIN).origin === RELATIVE_BASE_ORIGIN;
  } catch {
    return false;
  }
}

/**
 * Decide whether an href may be rendered as a link, and where it leads.
 *
 * This is the app's single definition of "safe link": rendered rich text, the
 * `/redirect` interstitial, PGN `[Site]` headers, and admin ad click-throughs
 * all classify through it, so a string that one surface treats as an off-site
 * link cannot be treated as a same-site path by another.
 *
 * Safety rests on the parsed `protocol` rather than on how the string starts.
 * `new URL()` lower-cases the scheme, so `HTTPS://example.com` is accepted the
 * way a browser accepts it, and an allow-list of exactly `http:` / `https:`
 * rejects every scheme that can execute — `javascript:`, `data:`, `vbscript:`,
 * `file:` — without a second deny-list to keep in sync. (`isDangerousUrl` in
 * `./linkify-urls` is that deny-list. It still guards `linkifyText`, which
 * picks URLs out of free text and never reaches this function, but for a whole
 * href the allow-list strictly subsumes it, so it is deliberately not called
 * here.)
 */
export function classifyLinkTarget(href: string, options: ClassifyOptions = {}): LinkTarget {
  const candidate = href.trim();
  if (candidate.length === 0 || candidate.length > MAX_LINK_HREF_LENGTH) return 'unsafe';

  if (isSiteRelative(candidate)) {
    return options.allowSiteRelative ? 'internal' : 'unsafe';
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return 'unsafe';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'unsafe';

  return isInternalUrl(candidate) ? 'internal' : 'external';
}
