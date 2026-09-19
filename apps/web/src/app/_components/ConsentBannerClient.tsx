'use client';

import type { ReactNode } from 'react';

import { Button } from '@/app/_components/Button';

import { recordConsent } from '@/lib/consent/consent-client';
import { useStorageAvailabilityContext } from '@/lib/storage/StorageAvailabilityProvider';

type Props = {
  /** Accessible name for the banner region. */
  regionLabel: string;
  acceptLabel: string;
  denyLabel: string;
  /** The server-rendered explanation, including the privacy-policy link. */
  children: ReactNode;
};

/**
 * The banner's shell and its two buttons. Everything readable is rendered on
 * the server and handed down as `children` / label props, so this component
 * adds no translation dictionary to the sitewide client payload — it exists
 * only for the click handlers and the storage gate.
 *
 * Visibility is not React state. The banner is in the server-rendered HTML of
 * every page and is hidden by the `html[data-consent] .consent-banner` rule in
 * each root layout's inline `<style>`, so a visitor who has already answered
 * never sees it — not even for a frame, because the `<head>` bootstrap script
 * sets the attribute before first paint. Clicking a button sets the same
 * attribute, and the same rule hides the banner again.
 *
 * `position: fixed` keeps it out of the document flow: it can appear and
 * disappear without moving anything on the page, so it contributes nothing to
 * Cumulative Layout Shift no matter when it renders.
 *
 * The storage gate is the one thing that can remove the banner after the fact.
 * `useStorageAvailabilityContext` returns `null` until its post-mount probe
 * finishes, and the banner deliberately renders through that `null` rather
 * than waiting: withholding it would put the banner outside the SSR'd HTML and
 * flash it in on every first visit, which is the case that matters. Only a
 * probe that positively reports blocked storage removes it — in that browser
 * the decision could not be persisted, so the banner would return on every
 * page load and nothing it offers would stick. `GoogleScripts` applies the
 * same gate to Google Analytics, so nothing is loaded behind the visitor's
 * back either.
 */
export function ConsentBannerClient({ regionLabel, acceptLabel, denyLabel, children }: Props) {
  const availability = useStorageAvailabilityContext();
  if (availability && !availability.all) return null;

  return (
    <div
      className="consent-banner fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card shadow-lg pb-[env(safe-area-inset-bottom)]"
      role="region"
      aria-label={regionLabel}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{children}</p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => recordConsent('denied')}>
            {denyLabel}
          </Button>
          <Button variant="primary" onClick={() => recordConsent('granted')}>
            {acceptLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
