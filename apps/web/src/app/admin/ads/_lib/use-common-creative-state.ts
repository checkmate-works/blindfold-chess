'use client';

import { useState } from 'react';

/**
 * The slot/kind-agnostic fields every creative shares — both the form's
 * initial values and the shape `toFields()` sends to the create/update
 * Server Actions (the two were structurally identical, so one type).
 */
export type CommonCreativeValues = {
  href: string;
  isActive: boolean;
};

/**
 * Owns the fields common to every creative kind (href, active), so the
 * per-kind forms only manage their own payload fields. `toFields()`
 * serializes them for the Server Actions. Sort order is set by drag-and-drop
 * on the slot list, not the form; there is no schedule.
 */
export function useCommonCreativeState(initial: CommonCreativeValues) {
  const [href, setHref] = useState(initial.href);
  const [isActive, setIsActive] = useState(initial.isActive);

  const toFields = (): CommonCreativeValues => ({
    href,
    isActive,
  });

  return {
    href,
    setHref,
    isActive,
    setIsActive,
    toFields,
  };
}

export type CommonCreativeState = ReturnType<typeof useCommonCreativeState>;
