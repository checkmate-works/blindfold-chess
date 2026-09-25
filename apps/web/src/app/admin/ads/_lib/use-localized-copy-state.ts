'use client';

import { useState } from 'react';

import type { StoredCopy } from '@/lib/ads/copy';
import { fromLocalizedCopyDraft, toLocalizedCopyDraft } from '@/lib/ads/copy';

/**
 * The per-locale title and description every native creative carries.
 *
 * Mirrors {@link useCreativeThumbnailState}: `fieldProps` spreads straight
 * into `LocalizedCopyFields`, and `toFields()` serializes the drafts for the
 * Server Actions. Previews read `title.en` / `description.en`, the copy every
 * unfilled locale falls back to.
 */
export function useLocalizedCopyState(initial: { title?: StoredCopy; description?: StoredCopy }) {
  const [title, setTitle] = useState(() => toLocalizedCopyDraft(initial.title));
  const [description, setDescription] = useState(() => toLocalizedCopyDraft(initial.description));

  const toFields = () => ({
    title: fromLocalizedCopyDraft(title),
    description: fromLocalizedCopyDraft(description),
  });

  return {
    title,
    description,
    toFields,
    fieldProps: {
      title,
      onTitleChange: (locale: keyof typeof title, value: string) =>
        setTitle((prev) => ({ ...prev, [locale]: value })),
      description,
      onDescriptionChange: (locale: keyof typeof description, value: string) =>
        setDescription((prev) => ({ ...prev, [locale]: value })),
    },
  };
}
