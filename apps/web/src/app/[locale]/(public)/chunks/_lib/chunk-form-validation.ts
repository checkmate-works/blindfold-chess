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
 * Submit gate run (in both create and edit) before writing the preview
 * draft. Mirrors the server-side guards in `createChunkEntry` /
 * `updateChunkEntry` and the draft→published rule in `publishChunkEntry`:
 * a chunk being published must carry a description. Surfacing these here
 * keeps the user on the field to fix instead of bouncing them off the
 * preview step.
 *
 * Returns the translation key of the first failing rule, or null when the
 * form is submittable.
 */
export function validateChunkForm(input: {
  isFenValid: boolean;
  title: string;
  slug: string;
  status: ChunkStatus;
  description: string;
}): ChunkFormErrorKey | null {
  if (!input.isFenValid) return 'errors.invalidFen';
  if (input.title.trim() === '') return 'errors.titleRequired';
  if (input.slug.trim() === '') return 'errors.slugRequired';
  if (input.status === 'published' && input.description.trim() === '') {
    return 'errors.descriptionRequired';
  }
  return null;
}
