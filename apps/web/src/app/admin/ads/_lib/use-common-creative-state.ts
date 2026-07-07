'use client';

import { useState } from 'react';

/** The slot/kind-agnostic fields every creative shares. */
export type CommonCreativeInitial = {
  href: string;
  isActive: boolean;
  sortOrder: number;
  startAt: string;
  endAt: string;
  targetCountry: string | null;
};

/** The common fields shaped for the create/update Server Actions. */
export type CommonCreativeFields = {
  href: string;
  isActive: boolean;
  sortOrder: number;
  startAt: string | null;
  endAt: string | null;
  targetCountry: string | null;
};

/** " jp " → 'JP'; empty → null (global). */
function parseCountry(text: string): string | null {
  const code = text.trim().toUpperCase();
  return code.length > 0 ? code : null;
}

/**
 * Owns the fields common to every creative kind (href, active, sort order,
 * schedule, country targeting), so the per-kind forms only manage their own
 * payload fields. `toFields()` serializes them for the Server Actions.
 */
export function useCommonCreativeState(initial: CommonCreativeInitial) {
  const [href, setHref] = useState(initial.href);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [sortOrder, setSortOrder] = useState(initial.sortOrder);
  const [startAt, setStartAt] = useState(initial.startAt);
  const [endAt, setEndAt] = useState(initial.endAt);
  const [countryText, setCountryText] = useState(initial.targetCountry ?? '');

  const toFields = (): CommonCreativeFields => ({
    href,
    isActive,
    sortOrder,
    startAt: startAt || null,
    endAt: endAt || null,
    targetCountry: parseCountry(countryText),
  });

  return {
    href,
    setHref,
    isActive,
    setIsActive,
    sortOrder,
    setSortOrder,
    startAt,
    setStartAt,
    endAt,
    setEndAt,
    countryText,
    setCountryText,
    toFields,
  };
}

export type CommonCreativeState = ReturnType<typeof useCommonCreativeState>;
