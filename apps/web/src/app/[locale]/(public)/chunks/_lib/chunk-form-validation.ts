import {
  CHUNK_DESCRIPTION_MAX_LENGTH,
  CHUNK_SLUG_MAX_LENGTH,
  CHUNK_SLUG_PATTERN,
  CHUNK_TITLE_MAX_LENGTH,
  type ChunkStatus,
} from '@/lib/chunks/validation';

/**
 * Translation keys (under `chunks.form`) for the synchronous form
 * validation errors.
 */
export type ChunkFormErrorKey =
  | 'errors.invalidFen'
  | 'errors.titleRequired'
  | 'errors.titleTooLong'
  | 'errors.slugRequired'
  | 'errors.slugInvalid'
  | 'errors.slugTooLong'
  | 'errors.descriptionRequired'
  | 'errors.descriptionTooLong';

/**
 * The control a validation error belongs to. Drives which input gets
 * `aria-invalid` + the inline message, and which one submit focuses.
 * `'fen'` covers both position-editing tabs (board and raw FEN).
 */
export type ChunkFormField = 'fen' | 'title' | 'slug' | 'description';

export type ChunkFormError = {
  field: ChunkFormField;
  key: ChunkFormErrorKey;
  /** ICU arguments for `key`, when the message names a limit. */
  values?: Record<string, number>;
};

/**
 * Submit gate run (in both create and edit) before writing the preview
 * draft. Mirrors the server-side guards in `createChunkEntry` /
 * `updateChunkEntry` and the draft→published rule in `publishChunkEntry`:
 * a chunk being published must carry a description. Surfacing these here
 * keeps the user on the field to fix instead of bouncing them off the
 * preview step.
 *
 * The shape rules (slug pattern, the three length caps) reuse the very
 * constants `validateChunkMutationData` checks against, so the two gates
 * cannot drift. They matter as much as the required-field rules: the
 * server states them as untranslated English prose, and only once the
 * preview's Confirm runs — two steps past the input at fault. `"Rook
 * Battery"` typed into the slug field, or a "Generate from title" result
 * for a title made of symbols (`deriveSlugFromTitle` can emit `""` or a
 * still-invalid string), both used to get that far before being refused.
 *
 * Returns the first failing rule as a `{ field, key }` pair — the field
 * is what makes the error placeable next to the control that caused it
 * rather than in a banner the author has to go looking for — or null
 * when the form is submittable.
 *
 * Slug *availability* is deliberately not here: it needs the server, and
 * the caller asks for it separately once these synchronous rules pass.
 */
export function validateChunkForm(input: {
  isFenValid: boolean;
  title: string;
  slug: string;
  status: ChunkStatus;
  description: string;
}): ChunkFormError | null {
  const title = input.title.trim();
  const slug = input.slug.trim();
  const description = input.description.trim();

  if (!input.isFenValid) return { field: 'fen', key: 'errors.invalidFen' };

  if (title === '') return { field: 'title', key: 'errors.titleRequired' };
  if (title.length > CHUNK_TITLE_MAX_LENGTH) {
    return { field: 'title', key: 'errors.titleTooLong', values: { max: CHUNK_TITLE_MAX_LENGTH } };
  }

  if (slug === '') return { field: 'slug', key: 'errors.slugRequired' };
  // Length before shape: a 60-character lowercase slug fails both rules,
  // and "too long" is the actionable half of that verdict.
  if (slug.length > CHUNK_SLUG_MAX_LENGTH) {
    return { field: 'slug', key: 'errors.slugTooLong', values: { max: CHUNK_SLUG_MAX_LENGTH } };
  }
  if (!CHUNK_SLUG_PATTERN.test(slug)) return { field: 'slug', key: 'errors.slugInvalid' };

  if (input.status === 'published' && description === '') {
    return { field: 'description', key: 'errors.descriptionRequired' };
  }
  if (description.length > CHUNK_DESCRIPTION_MAX_LENGTH) {
    return {
      field: 'description',
      key: 'errors.descriptionTooLong',
      values: { max: CHUNK_DESCRIPTION_MAX_LENGTH },
    };
  }

  return null;
}
