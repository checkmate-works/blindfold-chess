import type { ChunkStatus } from '@/lib/chunks/validation';

/**
 * Translation keys (under `chunks.form`) for the synchronous form
 * validation errors.
 */
export type ChunkFormErrorKey =
  | 'errors.invalidFen'
  | 'errors.titleRequired'
  | 'errors.slugRequired'
  | 'errors.descriptionRequired';

/**
 * The control a validation error belongs to. Drives which input gets
 * `aria-invalid` + the inline message, and which one submit focuses.
 * `'fen'` covers both position-editing tabs (board and raw FEN).
 */
export type ChunkFormField = 'fen' | 'title' | 'slug' | 'description';

export type ChunkFormError = { field: ChunkFormField; key: ChunkFormErrorKey };

/**
 * Submit gate run (in both create and edit) before writing the preview
 * draft. Mirrors the server-side guards in `createChunkEntry` /
 * `updateChunkEntry` and the draft→published rule in `publishChunkEntry`:
 * a chunk being published must carry a description. Surfacing these here
 * keeps the user on the field to fix instead of bouncing them off the
 * preview step.
 *
 * Returns the first failing rule as a `{ field, key }` pair — the field
 * is what makes the error placeable next to the control that caused it
 * rather than in a banner the author has to go looking for — or null
 * when the form is submittable.
 */
export function validateChunkForm(input: {
  isFenValid: boolean;
  title: string;
  slug: string;
  status: ChunkStatus;
  description: string;
}): ChunkFormError | null {
  if (!input.isFenValid) return { field: 'fen', key: 'errors.invalidFen' };
  if (input.title.trim() === '') return { field: 'title', key: 'errors.titleRequired' };
  if (input.slug.trim() === '') return { field: 'slug', key: 'errors.slugRequired' };
  if (input.status === 'published' && input.description.trim() === '') {
    return { field: 'description', key: 'errors.descriptionRequired' };
  }
  return null;
}
