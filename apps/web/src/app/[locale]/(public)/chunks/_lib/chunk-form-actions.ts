import type { useTranslations } from 'next-intl';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import type { ChunkFeedbackTopic } from '@/lib/chunks/validation';
import { localizeActionError } from '@/lib/i18n/localize-action-error';

import { publishChunk } from '../_actions/publishChunk';
import { updateChunk } from '../_actions/updateChunk';

/**
 * Set of server-side error codes the chunk form knows how to translate.
 * Codes outside this set fall through `localizeActionError`'s default
 * branch (currently a passthrough) so a server-side change that adds a
 * new code degrades to the raw key in the UI instead of throwing.
 */
export const CHUNK_FORM_ERROR_CODES = new Set([
  'signInRequired',
  'banned',
  'rateLimited',
  'slugTaken',
  'notFound',
  'unauthorized',
  'alreadyDeleted',
  'cannotEditPublished',
  'invalidFeedbackTopic',
  'descriptionRequired',
]);

/**
 * Same shape `useTranslations()` returns. Re-aliased here so call
 * sites in this module read as "translator that handles chunk form
 * keys" rather than the broader `next-intl` type.
 */
export type ChunkFormTranslator = ReturnType<typeof useTranslations>;

export type ChunkFormPayload = {
  representativeFen: string;
  title: string;
  slug: string;
  description: string;
  annotations: BoardAnnotations;
  feedbackTopics: ChunkFeedbackTopic[];
};

/**
 * Result type for actions whose success branch carries extra fields
 * (e.g. the post-save target slug). The `ok: false` branch carries a
 * pre-localized message so the form can `setError(result.error)`
 * directly without re-running the translator.
 */
export type ChunkActionResult<TOk extends object> =
  ({ ok: true } & TOk) | { ok: false; error: string };

/**
 * Persist the current edit-form state through `updateChunk`. Shared by
 * the plain Save flow and the Save-before-Publish flow so the payload
 * shape — including the "send slug only when changed" optimisation and
 * the empty-array-wipes contract for feedbackTopics — stays
 * single-sourced.
 *
 * Returns the slug the caller should navigate to on success so callers
 * don't have to recompute `slugChanged` themselves; mirrors the
 * server-side mutation layer, which intentionally allows slug renames
 * only while the chunk is in draft.
 */
export async function saveChunkEdit({
  initialId,
  initialSlug,
  payload,
  t,
}: {
  initialId: string;
  initialSlug: string;
  payload: ChunkFormPayload;
  t: ChunkFormTranslator;
}): Promise<ChunkActionResult<{ targetSlug: string }>> {
  const slugChanged = payload.slug.trim() !== initialSlug;
  const result = await updateChunk(initialId, {
    representativeFen: payload.representativeFen,
    title: payload.title,
    ...(slugChanged ? { slug: payload.slug.trim() } : {}),
    description: payload.description || null,
    annotations: payload.annotations,
    feedbackTopics: payload.feedbackTopics,
  });

  if ('error' in result) {
    return { ok: false, error: localizeActionError(result.error, t, CHUNK_FORM_ERROR_CODES) };
  }
  return { ok: true, targetSlug: slugChanged ? payload.slug.trim() : initialSlug };
}

type VoidResult = { ok: true } | { ok: false; error: string };

/** Server-side publish call + uniform error translation. */
export async function submitChunkPublish({
  chunkId,
  t,
}: {
  chunkId: string;
  t: ChunkFormTranslator;
}): Promise<VoidResult> {
  const result = await publishChunk(chunkId);
  if ('error' in result) {
    return { ok: false, error: localizeActionError(result.error, t, CHUNK_FORM_ERROR_CODES) };
  }
  return { ok: true };
}
