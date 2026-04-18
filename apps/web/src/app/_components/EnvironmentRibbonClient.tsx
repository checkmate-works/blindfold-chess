'use client';

import { useState } from 'react';

type EnvironmentRibbonVariant = 'LOCAL' | 'PREVIEW';

type EnvironmentRibbonClientProps = {
  variant: EnvironmentRibbonVariant;
};

/**
 * Client-side visual for the environment ribbon.
 *
 * Renders an interactive `<button>` so users can dismiss the ribbon by
 * click/tap (and via keyboard — Enter/Space come for free with the semantic
 * button element). Dismissal is in-memory only: reloading brings the ribbon
 * back, and there is no shortcut to restore it within the session.
 *
 * The `variant` prop doubles as the visible label text, since the two strings
 * we display (`"LOCAL"` / `"PREVIEW"`) are exactly the discriminant values.
 * Carrying a single prop instead of a redundant `label` + `variant` pair keeps
 * the two in sync by construction.
 *
 * Color classes are kept in sync with the industry-standard "bright yellow /
 * green" convention rather than the project's semantic tokens — see the
 * parent `EnvironmentRibbon.tsx` TSDoc for rationale.
 */
export function EnvironmentRibbonClient({ variant }: EnvironmentRibbonClientProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const colorClasses =
    variant === 'PREVIEW' ? 'bg-yellow-400 text-white' : 'bg-green-500 text-white';

  return (
    <button
      type="button"
      data-testid="environment-ribbon"
      aria-label={`Dismiss ${variant} environment indicator`}
      onClick={() => setDismissed(true)}
      className="fixed top-0 right-0 z-[60] h-24 w-24 overflow-hidden bg-transparent p-0 border-0 cursor-pointer print:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <span
        className={`absolute top-[18px] -right-[36px] w-[140px] rotate-45 text-center text-[11px] font-bold tracking-widest py-1 shadow-md ${colorClasses}`}
      >
        {variant}
      </span>
    </button>
  );
}
