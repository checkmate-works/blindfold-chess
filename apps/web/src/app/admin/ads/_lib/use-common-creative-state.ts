'use client';

import { useState } from 'react';

/** The slot/kind-agnostic fields every creative shares. */
export type CommonCreativeInitial = {
  href: string;
  isActive: boolean;
  sortOrder: number;
  startAt: string;
  endAt: string;
  targetCountries: string[] | null;
};

/** The common fields shaped for the create/update Server Actions. */
export type CommonCreativeFields = {
  href: string;
  isActive: boolean;
  sortOrder: number;
  startAt: string | null;
  endAt: string | null;
  targetCountries: string[] | null;
};

/** "JP, us , Fr" → ['JP','US','FR']; empty → null (global). */
function parseCountries(text: string): string[] | null {
  const codes = text
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return codes.length > 0 ? codes : null;
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
  const [countriesText, setCountriesText] = useState((initial.targetCountries ?? []).join(', '));

  const toFields = (): CommonCreativeFields => ({
    href,
    isActive,
    sortOrder,
    startAt: startAt || null,
    endAt: endAt || null,
    targetCountries: parseCountries(countriesText),
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
    countriesText,
    setCountriesText,
    toFields,
  };
}

export type CommonCreativeState = ReturnType<typeof useCommonCreativeState>;
