import { BasePostForm } from '@/app/[locale]/(public)/topics/_components/BasePostForm';

import { createChunkPostForImageAttach } from '../_actions/createChunkPostForImageAttach';
import { createChunkPostWithAttachment } from '../_actions/createChunkPostWithAttachment';
import { createChunkPostWithFenAttachment } from '../_actions/createChunkPostWithFenAttachment';

type Props = {
  locale: string;
  slug: string;
};

/**
 * @design Thin wrapper around `BasePostForm` (#84 horizontal rollout)
 *
 * The chunks new-post form was the original attachment-aware form
 * (#80 / #83 / #84). Its UI now lives in `BasePostForm` so any
 * future tweak (paperclip placement, modal layout, attachment
 * summary text) propagates to every form that opts in. This file
 * is intentionally limited to (a) binding the chunks-specific
 * Server Actions to the `(locale, slug)` pair, and (b) declaring
 * the i18n namespace.
 */
export function NewPostForm({ locale, slug }: Props) {
  const pgn = createChunkPostWithAttachment.bind(null, locale, slug);
  const fen = createChunkPostWithFenAttachment.bind(null, locale, slug);
  const image = createChunkPostForImageAttach.bind(null, locale, slug);

  return (
    <BasePostForm
      attachmentActions={{ pgn, fen, image }}
      translationNamespace="topics.chunks.newPostForm"
      contentRequired
    />
  );
}
