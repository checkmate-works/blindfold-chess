'use client';

import { useEffect } from 'react';

import { syncConsentAttribute } from './consent-client';

/**
 * Keeps `<html data-consent>` equal to the cookie across the client-side
 * remounts of `<html>` that erase it — a `[locale]` change, or a root-level
 * hydration failure; `syncConsentAttribute` explains both. Renders nothing.
 *
 * Every such remount also remounts this component, and a passive effect runs
 * after the commit in which React stripped the attribute, so "on mount" is
 * exactly the right moment. Place it in each root layout ahead of
 * `GoogleScripts`: sibling effects run in tree order, so the attribute is back
 * before the analytics gate reads it, instead of that gate briefly seeing "no
 * answer" and unmounting Google Analytics only to mount it again.
 */
export function ConsentAttributeSync() {
  useEffect(() => {
    syncConsentAttribute();
  }, []);
  return null;
}
