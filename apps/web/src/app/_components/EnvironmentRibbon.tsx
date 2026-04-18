import { EnvironmentRibbonClient } from './EnvironmentRibbonClient';

/**
 * Displays a diagonal ribbon in the top-right corner to identify the current
 * deployment environment at a glance (LOCAL / PREVIEW).
 *
 * Architecture: this file is a Server Component that performs the environment
 * detection (reading `VERCEL_ENV` / `NODE_ENV`, which are only reliably
 * available on the server) and decides whether to render. When it should
 * render, it delegates the actual visible element to
 * `EnvironmentRibbonClient` — a Client Component that owns the dismiss state
 * (`useState`) and the interactive `<button>`. `VERCEL_ENV` is intentionally
 * NOT forwarded to the client via a `NEXT_PUBLIC_*` variable; instead the
 * server resolves a small `variant` prop so the client never needs to know
 * about Vercel internals.
 *
 * Placed under `src/app/_components/` (not `[locale]/_components/`) because
 * the app has multiple root layouts — `[locale]/layout.tsx`,
 * `(landing)/layout.tsx`, and `admin/layout.tsx` — each emitting its own
 * `<html>`/`<body>`. Mounting the ribbon in only one of them causes it to be
 * missing on the routes served by the others (e.g. the root `/` URL served
 * by `(landing)`). Keeping this component in a location reachable from every
 * root layout lets every layout include it with a single import.
 *
 * Environment resolution (in order):
 * - VERCEL_ENV === 'production' → hidden (never show in production)
 * - NODE_ENV === 'test'         → hidden (avoid Playwright/E2E interference)
 * - VERCEL_ENV === 'preview'    → yellow "PREVIEW" ribbon
 *   (Note: Vercel preview builds run with NODE_ENV === 'production', so we
 *   must NOT gate on NODE_ENV here — only VERCEL_ENV distinguishes preview
 *   from production.)
 * - VERCEL_ENV === 'development' OR unset, AND NODE_ENV !== 'production'
 *                                → green "LOCAL" ribbon
 *   (Self-hosted / non-Vercel production builds set NODE_ENV=production with
 *   VERCEL_ENV unset; this clause ensures we do not flash "LOCAL" there.)
 * - anything else                → hidden (fail-safe)
 *
 * Text is English-only by design (developer tooling, not user-facing).
 *
 * Colors: intentionally uses Tailwind default palette (bg-yellow-400 /
 * bg-green-500 / text-white) instead of the project's semantic tokens
 * (bg-warning / bg-success / text-foreground). The semantic `warning` token is
 * orange-leaning, which conflicts with the conventional "bright yellow" used
 * by deploy-preview ribbons across the industry. This developer-facing
 * indicator prioritizes color-recognition convention over the "No Hardcoded
 * Colors" rule in apps/web/CLAUDE.md, and is the only place in the web app
 * where that deviation is intentional.
 *
 * Dismissal: the rendered ribbon is a real `<button>` that can be clicked /
 * tapped / activated via Enter or Space. Dismiss state lives only in React
 * memory (no session/local storage) — reloading the page brings the ribbon
 * back. See `EnvironmentRibbonClient.tsx` for the interactive behavior.
 */
export function EnvironmentRibbon() {
  const vercelEnv = process.env.VERCEL_ENV;
  const nodeEnv = process.env.NODE_ENV;

  // Hard gate: production MUST NEVER render this ribbon.
  if (vercelEnv === 'production') return null;
  if (nodeEnv === 'test') return null;

  if (vercelEnv === 'preview') {
    // Vercel preview builds run with NODE_ENV='production' — that is expected
    // and must not hide the ribbon.
    return <EnvironmentRibbonClient variant="PREVIEW" />;
  }

  if ((vercelEnv === 'development' || vercelEnv === undefined) && nodeEnv !== 'production') {
    // Purely local dev. Guarding on nodeEnv !== 'production' prevents a
    // self-hosted / non-Vercel production build (no VERCEL_ENV) from showing
    // the "LOCAL" ribbon.
    return <EnvironmentRibbonClient variant="LOCAL" />;
  }

  return null;
}
