'use client';

import { useEffect, useState } from 'react';

import { currentConsentDecision } from './consent-client';
import type { ConsentDecision } from './consent-cookie';
import { CONSENT_CHANGED_EVENT } from './consent-events';

/**
 * Subscribe to the consent decision currently in force.
 *
 * Returns `null` during SSR and the first client render — the same "not known
 * yet" value it returns for a visitor who has not answered. Both must render
 * as "analytics withheld", so collapsing them costs nothing and keeps the
 * server-rendered HTML identical in every environment.
 */
export function useConsentDecision(): ConsentDecision | null {
  const [decision, setDecision] = useState<ConsentDecision | null>(null);

  useEffect(() => {
    const read = () => setDecision(currentConsentDecision());
    read();
    window.addEventListener(CONSENT_CHANGED_EVENT, read);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, read);
  }, []);

  return decision;
}
