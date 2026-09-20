'use client';

import { useState } from 'react';

import type { StoredCopy } from '@/lib/ads/copy';
import type { NativeCardThumbnail } from '@/lib/ads/thumbnail';

/**
 * The slot/kind-agnostic fields every creative shares — both the form's
 * initial values and the part of the submitted fields this hook owns.
 */
export type CommonCreativeValues = {
  href: string;
  isActive: boolean;
};

/**
 * What a form starts from: the common fields, plus whichever stored columns
 * the creative already has. Everything past the common fields is optional
 * because a new creative has none of it, and a card never has an `icon` any
 * more than a tile has an avatar.
 */
export type CreativeFormInitial = CommonCreativeValues & {
  icon?: string | null;
  avatarImagePath?: string | null;
  avatarAlt?: string | null;
  thumbnail?: NativeCardThumbnail;
  title?: StoredCopy;
  description?: StoredCopy;
};

/**
 * Owns the fields common to every creative kind (href, active), so the
 * per-kind forms only manage their own fields. `toFields()` serializes them
 * for the Server Actions. Sort order is set by drag-and-drop on the slot
 * list, not the form; there is no schedule.
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
