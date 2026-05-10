'use server';

import { validateFenSemantic } from '@blindfold-chess/features/chess-core';

import type { db } from '@/lib/db';
import { postFenAttachments } from '@/lib/db';
import { extractPgErrorCode } from '@/lib/db/extract-pg-error-code';
import { FEN_MAX_LENGTH } from '@/lib/post-fens/constants';
import { sanitizeFenCaption } from '@/lib/post-fens/sanitize-fen-caption';

import type { TopicType } from '@/app/[locale]/(public)/topics/_lib/constants';

import type { CreateReplyState } from './createReply';
import { createReplyBase } from './createReply';

/**
 * @design Shared FEN-attachment-aware reply Server Action body (#84 phase D)
 *
 * Mirrors `createPostWithFenAttachmentBase` for the reply (comment)
 * surface. See that file for the trim-canonicalization and SQLSTATE
 * mapping rationale — the contract is byte-for-byte identical, only
 * the underlying base call (`createReplyBase` vs `createPostBase`)
 * differs.
 */

const CAPTION_MAX_LENGTH = 200;

type ExtraAfterInsert = (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  replyId: string
) => Promise<void>;

export async function createReplyWithFenAttachmentBase(args: {
  locale: string;
  topicIdentifier: string;
  postId: string;
  topicType: TopicType;
  topicKey: string;
  urlSegment: string;
  validateTopic: (identifier: string) => boolean | Promise<boolean>;
  redirectPath?: (postId: string, replyId: string) => string;
  revalidate?: (postId: string) => string;
  isSpoiler?: boolean;
  /** Topic-specific extra rows to insert inside the same transaction. */
  extraAfterInsert?: ExtraAfterInsert;
  formData: FormData;
}): Promise<CreateReplyState> {
  const { formData, extraAfterInsert, ...replySpec } = args;

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
    return await createReplyBase({
      ...replySpec,
      afterInsert: async (tx, replyId) => {
        await tx.insert(postFenAttachments).values({
          postId: replyId,
          fen,
          caption,
        });
        if (extraAfterInsert) {
          await extraAfterInsert(tx, replyId);
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
