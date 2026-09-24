import { SUPPORTED_LOCALES } from '@/config';

import { isFramablePath } from '@/lib/security/framing';

/**
 * When an embedded game replay (`/embed/...`) may be served from Vercel's CDN
 * instead of rendering again for every iframe load.
 *
 * ## Why only with `?lang=`
 *
 * The embed is pasted into somebody else's article, so its traffic follows
 * *their* audience, and without a CDN copy every page view of that article is
 * one function invocation plus one game query on this account. The response
 * body, however, is the same for every reader of a given URL with exactly one
 * exception: the widget's language. Without `?lang=` it is negotiated from the
 * reader's `Accept-Language`, which a shared cache could only honour with
 * `Vary: Accept-Language` — and real-world values of that header are diverse
 * enough (`ja,en-US;q=0.9,en;q=0.8` and every permutation) that such a cache
 * would almost never hit.
 *
 * Defaulting the language to make the embed cacheable is ruled out: readers
 * arrive in their own languages, and baking the blogger's language into the
 * snippet would impose it on all of them. So the CDN copy is reserved for the
 * case where the blogger has *already* pinned the language through the share
 * dialog's opt-in. There the URL alone determines the body, and a cache keyed
 * on the full URL (every display option is a query param) is exact.
 *
 * ## The three places that must agree
 *
 * 1. **This predicate**, which `src/proxy.ts` evaluates to choose the CSP
 *    variant and to skip the session refresh.
 * 2. **The `Vercel-CDN-Cache-Control` rule in `next.config.ts`**, which is
 *    what actually makes Vercel store the response. It has to be a config
 *    header: the page cannot set response headers, Next stamps its dynamic
 *    renders `Cache-Control: private, no-store`, and a function's own
 *    `Cache-Control` beats a config one — but `Vercel-CDN-Cache-Control` from
 *    config outranks both. It cannot import this module, so it repeats the
 *    locale list as a literal; `embed-cdn-cache.test.ts` asserts the two
 *    select the same requests.
 * 3. **The rendered body**, which must be identical for every request the
 *    rule caches. That is why the proxy serves these responses the
 *    static-content CSP (no nonce: Next copies a CSP nonce into the scripts it
 *    renders, and a cached body would then carry the first visitor's nonce
 *    under every later visitor's header), and why the embed's not-found page
 *    honours `?lang=` rather than negotiating.
 *
 * A repeated `lang` key is the one input on which the config rule (which reads
 * the *last* value) and the app (which reads the *first*, see
 * `parseEmbedParams`) disagree. The proxy redirects such a URL to its
 * single-`lang` form before either sees it — see {@link embedLangNeedsCollapse}.
 */

/**
 * The CDN directive for a cacheable embed.
 *
 * - `s-maxage=300`: a cached embed keeps serving a game after its owner
 *   deletes or unpublishes it (or deletes their account), and nothing purges
 *   the copy on those events. Five minutes bounds that for an embed that is
 *   actually being read, while still collapsing a popular article's traffic to
 *   at most one render per URL per region every five minutes — the difference
 *   between tens of thousands of invocations a day and a few hundred.
 * - `stale-while-revalidate=900`: after the five minutes, the next reader gets
 *   the stored copy instantly while a fresh one renders in the background. It
 *   is kept to fifteen minutes because it also widens the removal window: a
 *   request landing inside it is answered with the stale copy while the
 *   refresh runs. The worst case a removed game can still be shown is
 *   therefore 20 minutes, and past the first five only to the requests that
 *   race that one refresh.
 *
 * Browsers keep Next's own `private, no-store` answer, so a reader's refresh
 * goes back to the CDN and sees removal on the same schedule rather than on
 * their browser's.
 */
export const EMBED_CDN_CACHE_CONTROL = 's-maxage=300, stale-while-revalidate=900';

/**
 * Whether this request's response may be stored in the CDN — an embed path
 * whose language is pinned by exactly one `lang` param naming a supported
 * locale. An unsupported value falls back to negotiation (see
 * `parseEmbedParams`), so it is as uncacheable as no value at all.
 */
export function isCdnCacheableEmbedRequest(
  pathname: string,
  searchParams: URLSearchParams
): boolean {
  if (!isFramablePath(pathname)) return false;
  const langs = searchParams.getAll('lang');
  return langs.length === 1 && (SUPPORTED_LOCALES as readonly string[]).includes(langs[0]);
}

/**
 * Whether an embed URL carries more than one `lang` param, and so must be
 * redirected to the form with only the first one before it renders.
 *
 * Next's `has` matcher (which gates the CDN rule) reads the last value of a
 * repeated query key; the embed reads the first. Left alone,
 * `?lang=xx&lang=ja` would be stored by the CDN while rendering in whatever
 * language its first reader negotiated. Collapsing it first means no rendered
 * URL is ambiguous, whichever value any layer prefers.
 */
export function embedLangNeedsCollapse(pathname: string, searchParams: URLSearchParams): boolean {
  return isFramablePath(pathname) && searchParams.getAll('lang').length > 1;
}
