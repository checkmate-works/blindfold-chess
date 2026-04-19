'use client';

import { type ReactNode, createContext, useContext } from 'react';

import { type StorageAvailability } from './storage-availability';
import { useStorageAvailability } from './useStorageAvailability';

/**
 * Context value is `StorageAvailability | null`:
 * - `null` during SSR and the first client render, before the probe runs.
 * - A concrete `StorageAvailability` object after the post-mount effect.
 *
 * A separate sentinel distinguishes "consumer is outside a provider" from
 * "probe has not finished yet" — consumers should treat both as "gate
 * closed, render nothing".
 */
const StorageAvailabilityContext = createContext<StorageAvailability | null>(null);

/**
 * Runs the storage feature-detection probe exactly once per tree and fans
 * the result out to all descendants via context.
 *
 * Mount this in each root layout (`[locale]/layout.tsx`,
 * `(landing)/layout.tsx`) — they are sibling root layouts, each with its
 * own `<html>`/`<body>`, so each needs its own provider instance. Nested
 * layouts (e.g. `[locale]/(public)/layout.tsx`) MUST NOT mount another
 * provider; they and their `GoogleScripts` / ad components consume the
 * parent provider, guaranteeing a single probe per page load.
 */
export function StorageAvailabilityProvider({ children }: { children: ReactNode }) {
  const availability = useStorageAvailability();

  return (
    <StorageAvailabilityContext.Provider value={availability}>
      {children}
    </StorageAvailabilityContext.Provider>
  );
}

/**
 * Read the storage availability result from the nearest
 * `StorageAvailabilityProvider`. Returns `null` until the post-mount probe
 * completes, or when the component tree is rendered outside a provider.
 *
 * Callers that gate Google / AdSense scripts should treat `null` exactly
 * like `{ all: false }` — render nothing.
 */
export function useStorageAvailabilityContext(): StorageAvailability | null {
  return useContext(StorageAvailabilityContext);
}
