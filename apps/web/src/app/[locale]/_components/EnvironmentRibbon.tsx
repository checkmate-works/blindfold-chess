/**
 * Displays a diagonal ribbon in the top-right corner to identify the current
 * deployment environment at a glance (LOCAL / PREVIEW). Rendered as a Server
 * Component so it contributes zero bytes to the client JS bundle.
 *
 * Environment resolution (in order):
 * - VERCEL_ENV === 'production' → hidden (never show in production)
 * - NODE_ENV === 'test'         → hidden (avoid Playwright/E2E interference)
 * - VERCEL_ENV === 'preview'    → yellow "PREVIEW" ribbon
 * - otherwise local dev         → green "LOCAL" ribbon
 * - anything else               → hidden (fail-safe)
 *
 * Text is English-only by design (developer tooling, not user-facing).
 *
 * Colors: intentionally uses Tailwind default palette (bg-yellow-400 /
 * bg-green-500) instead of the project's semantic tokens (bg-warning /
 * bg-success). The semantic `warning` token is orange-leaning, which conflicts
 * with the conventional "bright yellow" used by deploy-preview ribbons across
 * the industry. This developer-facing indicator prioritizes color-recognition
 * convention over the "No Hardcoded Colors" rule in apps/web/CLAUDE.md, and is
 * the only place in the web app where that deviation is intentional.
 */
export function EnvironmentRibbon() {
  const vercelEnv = process.env.VERCEL_ENV;
  const nodeEnv = process.env.NODE_ENV;

  if (vercelEnv === 'production') return null;
  if (nodeEnv === 'test') return null;

  let label: 'PREVIEW' | 'LOCAL';
  let colorClasses: string;

  if (vercelEnv === 'preview') {
    label = 'PREVIEW';
    colorClasses = 'bg-yellow-400 text-yellow-950';
  } else if ((vercelEnv === 'development' || vercelEnv === undefined) && nodeEnv !== 'production') {
    label = 'LOCAL';
    colorClasses = 'bg-green-500 text-green-950';
  } else {
    return null;
  }

  return (
    <div
      aria-hidden="true"
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
