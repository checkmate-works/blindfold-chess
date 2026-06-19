import { REPERTOIRE_MOVE_TOPIC_TYPE, parseMoveTopicKey } from '@/lib/repertoires/move-topic-key';
import { getRepertoireById } from '@/lib/repertoires/queries';
import { resolveLineForPosition } from '@/lib/repertoires/resolve-line-position';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { readSpoilerFlag } from '@/lib/spoiler-flag';
import { validateContent } from '@/lib/validations/content';

import type { TopicType } from '@/app/[locale]/(public)/topics/_lib/constants';

// In an inline base-action call `topicType` is contextually typed as TopicType;
// inside a returned config it loses that context and widens to string, so pin it.
const MOVE_TOPIC_TYPE: TopicType = REPERTOIRE_MOVE_TOPIC_TYPE;

/**
 * Shared builders for the per-move comment action wrappers. The five thin
 * `"use server"` wrappers differ only in which base action they call (PGN vs
 * FEN attachment, post vs reply, like); the topic spec they pass is identical,
 * so it lives here once. `topicType` keeps its literal type via
 * `REPERTOIRE_MOVE_TOPIC_TYPE`, so the returned config stays assignable to the
 * base actions' params.
 */
type MoveError = { error: 'Invalid move' };

/**
 * Resolve the line URL a position-keyed thread should land on. The thread key
 * carries only the position hash, so reply/like recover a concrete line + ply
 * by replaying the repertoire. `withMove` adds the `?move=` the line page reads.
 */
export async function resolveMoveLinePath(
  locale: string,
  repertoireId: string,
  positionHash: string,
  withMove: boolean
): Promise<{ path: string; resolved: boolean }> {
  const resolved = await resolveLineForPosition(repertoireId, positionHash);
  if (!resolved) return { path: `/${locale}/repertoires/${repertoireId}`, resolved: false };
  const move = withMove ? `?move=${resolved.ply}` : '';
  return {
    path: `/${locale}/repertoires/${repertoireId}/lines/${resolved.lineNo}${move}`,
    resolved: true,
  };
}

/** Topic spec for a top-level move comment. `lineNo`/`ply` only steer the redirect. */
export async function buildMovePostConfig(opts: {
  locale: string;
  topicKey: string;
  lineNo: number;
  ply: number;
  formData: FormData;
}) {
  const parsed = parseMoveTopicKey(opts.topicKey);
  if (!parsed) return { error: 'Invalid move' } satisfies MoveError;
  const { repertoireId } = parsed;
  const repertoire = await getRepertoireById(repertoireId);
  const { locale, topicKey, lineNo, ply, formData } = opts;

  return {
    locale,
    topicIdentifier: topicKey,
    topicType: MOVE_TOPIC_TYPE,
    topicKey,
    urlSegment: 'repertoires',
    validateTopic: () => repertoire !== null,
    invalidTopicError: 'Invalid repertoire',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    isSpoiler: readSpoilerFlag(formData),
    topicAuthorId: repertoire?.userId,
    redirectPath: (postId: string, { toast }: { toast: boolean }) =>
      `/${locale}/repertoires/${repertoireId}/lines/${lineNo}?move=${ply}${
        toast ? '&toast=post_created' : ''
      }#post-${postId}`,
    formData,
  };
}

/** Topic spec for a reply to a move comment; redirects back to the resolved line. */
export async function buildMoveReplyConfig(opts: {
  locale: string;
  topicKey: string;
  postId: string;
  formData: FormData;
}) {
  const parsed = parseMoveTopicKey(opts.topicKey);
  if (!parsed) return { error: 'Invalid move' } satisfies MoveError;
  const { repertoireId, positionHash } = parsed;
  const { locale, topicKey, postId, formData } = opts;
  const { path, resolved } = await resolveMoveLinePath(locale, repertoireId, positionHash, true);

  return {
    locale,
    topicIdentifier: topicKey,
    postId,
    topicType: MOVE_TOPIC_TYPE,
    topicKey,
    urlSegment: 'repertoires',
    validateTopic: async () => (await getRepertoireById(repertoireId)) !== null,
    redirectPath: (_postId: string, replyId: string) =>
      `${path}${resolved ? '&' : '?'}toast=post_created#post-${replyId}`,
    revalidate: () => path.split('?')[0],
    isSpoiler: readSpoilerFlag(formData),
    formData,
  };
}
