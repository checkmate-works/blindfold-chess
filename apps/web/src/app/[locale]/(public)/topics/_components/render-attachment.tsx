import type { PostAttachment } from '@/lib/games/get-attachments-for-posts';

import { AttachedEmbedCard } from './AttachedEmbedCard';
import { AttachedFenCard } from './AttachedFenCard';
import { AttachedGameCard } from './AttachedGameCard';
import { AttachedImageCard } from './AttachedImageCard';
import { AttachedVideoCard } from './AttachedVideoCard';

/**
 * Single switch over `PostAttachment.kind` that picks the right
 * Attached* card. Hoisted to the topics shared layer so every page
 * that surfaces attachments — both on the OP card and on individual
 * replies inside the comment tree — uses the same renderer.
 *
 * The video card needs an i18n fallback title; passed in by callers
 * so this helper stays a plain function (no `useTranslations` here).
 */
export function renderAttachment(
  attachment: PostAttachment,
  fallbackVideoTitle: string
): React.ReactNode {
  switch (attachment.kind) {
    case 'pgn':
      return <AttachedGameCard attachment={attachment.data} />;
    case 'embed':
      return <AttachedEmbedCard attachment={attachment.data} />;
    case 'image':
      return <AttachedImageCard attachments={attachment.data} />;
    case 'fen':
      return <AttachedFenCard attachment={attachment.data} />;
    case 'video':
      return <AttachedVideoCard attachment={attachment.data} fallbackTitle={fallbackVideoTitle} />;
    default: {
      const _exhaustive: never = attachment;
      void _exhaustive;
      return null;
    }
  }
}

/**
 * Build a `Map<postId, ReactNode>` for use as `CommentTree`'s
 * `extraContentByPostId` prop. Skips ids whose attachment lookup
 * misses (no row in any attachment table) so the Map stays sparse.
 */
export function buildAttachmentNodeMap(
  postIds: readonly string[],
  attachments: ReadonlyMap<string, PostAttachment>,
  fallbackVideoTitle: string
): ReadonlyMap<string, React.ReactNode> {
  const out = new Map<string, React.ReactNode>();
  for (const id of postIds) {
    const att = attachments.get(id);
    if (att) {
      out.set(id, renderAttachment(att, fallbackVideoTitle));
    }
  }
  return out;
}
