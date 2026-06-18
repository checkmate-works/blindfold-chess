'use server';

import { validateFenSemantic } from '@blindfold-chess/features/chess-core';

import { postFenAttachments } from '@/lib/db';
import { extractPgErrorCode } from '@/lib/db/extract-pg-error-code';
import type { DbTx } from '@/lib/db/types';
import { FEN_MAX_LENGTH } from '@/lib/post-fens/constants';
import { sanitizeFenCaption } from '@/lib/post-fens/sanitize-fen-caption';
import type { RateLimitConfig } from '@/lib/security/rate-limit';

import type { TopicType } from '@/app/[locale]/(public)/topics/_lib/constants';

import type { CreatePostState } from './createPost';
import { createPostBase } from './createPost';

/**
 * @design Shared FEN-attachment-aware Server Action body (#84 step 2)
 *
 * Mirrors `createPostWithAttachmentBase` for the FEN attachment kind.
 * The PGN base handles `attachment` form fields and routes through
 * `post_game_pgn_attachments`; this base handles `attachmentFen` /
 * `attachmentFenCaption` form fields and routes through
 * `post_fen_attachments`. Each topicType wrapper just describes its
 * topic spec and forwards FormData.
 *
 * @design Trim canonicalization (Lessons §10)
 *
 * `validateFenSemantic` calls `.trim()` internally, but the DB CHECK
 * regex is anchored (^...$) and does NOT trim. The single trim at
 * the top keeps validator contract and DB contract in lock-step.
 *
 * @design SQLSTATE mapping (Lessons §11 + §16)
 *
 * 23505 → alreadyAttached, 23514 → invalidFenStructure (defense-in-
 * depth), 22001 → fenTooLong (defense-in-depth). The two defensive
 * branches are practically unreachable from the action layer because
 * the upstream regex / length pre-check fire first.
 */

const CAPTION_MAX_LENGTH = 200;

type ExtraAfterInsert = (tx: DbTx, postId: string) => Promise<void>;

export async function createPostWithFenAttachmentBase(args: {
  locale: string;
  topicIdentifier: string;
  topicType: TopicType;
  topicKey: string;
  urlSegment: string;
  validateTopic: (identifier: string) => boolean | Promise<boolean>;
  invalidTopicError: string;
  rateLimit: RateLimitConfig;
  validateContent: (formData: FormData) => { error: string } | { content: string };
  redirectPath?: (postId: string, opts: { toast: boolean }) => string;
  emitFeedItem?: boolean;
  isSpoiler?: boolean;
  topicAuthorId?: string | null;
  /** Topic-specific extra rows to insert inside the same transaction. */
  extraAfterInsert?: ExtraAfterInsert;
  formData: FormData;
}): Promise<CreatePostState> {
  const { formData, extraAfterInsert, ...topicSpec } = args;

  const rawFenInput = formData.get('attachmentFen');
  const rawCaptionInput = formData.get('attachmentFenCaption');

  // Single canonical trim (Lessons §10).
  const fen = typeof rawFenInput === 'string' ? rawFenInput.trim() : '';

  if (fen.length === 0) {
    return { error: 'postFenAttachment.error.fenRequired' };
  }
  if (fen.length > FEN_MAX_LENGTH) {
    return { error: 'postFenAttachment.error.fenTooLong' };
  }

  const fenResult = validateFenSemantic(fen);
  if (!fenResult.ok) {
    switch (fenResult.reason) {
      case 'structure':
        return { error: 'postFenAttachment.error.invalidFenStructure' };
      case 'kings':
      case 'pawn_placement':
      case 'piece_count':
      case 'castling_rights':
      case 'en_passant':
      case 'illegal_position':
        return { error: 'postFenAttachment.error.invalidFenSemantic' };
      default: {
        const _exhaustive: never = fenResult.reason;
        void _exhaustive;
        return { error: 'postFenAttachment.error.invalidFenSemantic' };
      }
    }
  }

  const rawCaption = typeof rawCaptionInput === 'string' ? rawCaptionInput : null;
  if (typeof rawCaption === 'string' && rawCaption.length > CAPTION_MAX_LENGTH) {
    return { error: 'postFenAttachment.error.captionTooLong' };
  }
  const caption = sanitizeFenCaption(rawCaption);

  try {
    return await createPostBase({
      ...topicSpec,
      afterInsert: async (tx, postId) => {
        await tx.insert(postFenAttachments).values({
          postId,
          fen,
          caption,
        });
        if (extraAfterInsert) {
          await extraAfterInsert(tx, postId);
        }
      },
      formData,
    });
  } catch (err) {
    const code = extractPgErrorCode(err);
    if (code === '23505') {
      return { error: 'postFenAttachment.error.alreadyAttached' };
    }
    if (code === '23514') {
      return { error: 'postFenAttachment.error.invalidFenStructure' };
    }
    if (code === '22001') {
      return { error: 'postFenAttachment.error.fenTooLong' };
    }
    throw err;
  }
}
