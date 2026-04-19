'use client';

import { useEffect, useState } from 'react';

import { type StorageAvailability, detectStorageAvailability } from './storage-availability';

/**
 * Client-only hook that runs `detectStorageAvailability()` once after mount.
 *
 * Returns `null` until the effect has run (initial render and SSR). Callers
 * should render nothing for the `null` case so that the server-rendered HTML
 * matches the first client render — this avoids hydration mismatches even
 * when the underlying probes would touch browser-only globals.
 */
export function useStorageAvailability(): StorageAvailability | null {
  const [availability, setAvailability] = useState<StorageAvailability | null>(null);

  useEffect(() => {
    setAvailability(detectStorageAvailability());
  }, []);

  return availability;
}
