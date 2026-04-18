/**
 * Displays a diagonal ribbon in the top-right corner to identify the current
 * deployment environment at a glance (LOCAL / PREVIEW). Rendered as a Server
 * Component so it contributes zero bytes to the client JS bundle.
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
 */
export function EnvironmentRibbon() {
  const vercelEnv = process.env.VERCEL_ENV;
  const nodeEnv = process.env.NODE_ENV;

  // Hard gate: production MUST NEVER render this ribbon.
  if (vercelEnv === 'production') return null;
  if (nodeEnv === 'test') return null;

  let label: 'PREVIEW' | 'LOCAL';
  let colorClasses: string;

  if (vercelEnv === 'preview') {
    // Vercel preview builds run with NODE_ENV='production' — that is expected
    // and must not hide the ribbon.
    label = 'PREVIEW';
    colorClasses = 'bg-yellow-400 text-white';
  } else if ((vercelEnv === 'development' || vercelEnv === undefined) && nodeEnv !== 'production') {
    // Purely local dev. Guarding on nodeEnv !== 'production' prevents a
    // self-hosted / non-Vercel production build (no VERCEL_ENV) from showing
    // the "LOCAL" ribbon.
    label = 'LOCAL';
    colorClasses = 'bg-green-500 text-white';
  } else {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      data-testid="environment-ribbon"
      className="pointer-events-none fixed top-0 right-0 z-[60] h-24 w-24 overflow-hidden print:hidden"
    >
      <span
        className={`absolute top-[18px] -right-[36px] w-[140px] rotate-45 text-center text-[11px] font-bold tracking-widest py-1 shadow-md ${colorClasses}`}
      >
        {label}
      </span>
    </div>
  );
}
