import { SUPPORTED_LOCALES } from '@/config';

/**
 * Route namespaces (path after the `/{locale}` segment) that are served the
 * **static-content CSP variant** by `src/proxy.ts` instead of the per-request
 * nonce + `'strict-dynamic'` policy.
 *
 * Why two policies exist at all: a nonce-based `script-src` only works when
 * every response is rendered per request — the nonce in the header must match
 * the nonce baked into the HTML. Prerendered (SSG/ISR) HTML is shared across
 * requests and can never carry a per-request nonce, so Next.js's own inline
 * flight scripts and chunk loaders in that HTML would violate the nonce
 * policy on every page view. Routes listed here are the ones this app
 * prerenders (static params / ISR `revalidate` exports); they get a policy
 * whose `script-src` falls back to `'unsafe-inline'` instead.
 *
 * Trade-off, stated honestly: on these routes `script-src` provides
 * effectively no injection protection (that is the price of caching the
 * HTML). Their XSS defence is React's output escaping plus the remaining
 * directives (`connect-src`, `frame-src`, `object-src`, `base-uri`,
 * `form-action`), which are identical in both variants. This is acceptable
 * here because these namespaces render admin-authored or code-authored
 * content and no per-user data. Auth-carrying and UGC-heavy surfaces
 * (`/mypage`, `/admin`, `/games/play`, the home feed, `/topics`, `/u/...`,
 * …) are deliberately NOT listed and keep the strict nonce policy.
 *
 * Misclassification cost is asymmetric, so lean conservative:
 * - A prerendered route MISSING from this list still works (the policy is
 *   report-only — see issue #89) but floods `/api/csp-report` with framework
 *   -script violations on every view, and would break outright once the
 *   policy enforces.
 * - A dynamic route listed here merely gets the weaker script-src; nothing
 *   breaks. A few dynamic pages inside these namespaces (e.g. auth-aware
 *   practice result pages) accept that trade for a maintainable prefix list.
 *
 * Keep this list in sync with the build's route table: after `pnpm build`,
 * every route marked `○` (static) or with a `revalidate` interval should be
 * covered by a prefix below.
 */
const STATIC_CONTENT_NAMESPACES = [
  'affiliate-disclosure',
  'announcements',
  'articles',
  'coin',
  'company',
  'contact',
  'dojo',
  'faq',
  'games/bulk-delete',
  'games/new',
  'games/play/error',
  'getting-started',
  'glossary',
  'interview',
  'learn',
  'licenses',
  'manual',
  'practice',
  'preferences',
  'pricing',
  'privacy',
  'terms',
] as const;

/**
 * Exact-match-only entries: the path itself is prerendered but its children
 * are NOT (they are auth-carrying or interactive). `games` — the list page
 * renders localStorage-backed games client-side and is SSG, while
 * `games/play` (Stockfish/auth) and `games/shared` stay on the nonce policy.
 */
const STATIC_CONTENT_EXACT_PATHS = ['games'] as const;

const LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);

/**
 * Decide whether `pathname` (full, locale-prefixed — e.g. `/ja/faq`) belongs
 * to a static-content namespace. Non-`[locale]` surfaces (`/`, `/embed`,
 * `/admin`, `/auth`) never match: they are dynamic by design.
 */
export function isStaticContentPath(pathname: string): boolean {
  const [, first, ...rest] = pathname.split('/');
  if (!first || !LOCALE_SET.has(first)) return false;
  const afterLocale = rest.join('/');
  if ((STATIC_CONTENT_EXACT_PATHS as readonly string[]).includes(afterLocale)) return true;
  return STATIC_CONTENT_NAMESPACES.some(
    (ns) => afterLocale === ns || afterLocale.startsWith(ns + '/')
  );
}
