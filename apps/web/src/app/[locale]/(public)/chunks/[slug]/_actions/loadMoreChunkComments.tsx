'use server';

import { getChunkBySlug } from '@/lib/chunks/queries';

import type { LoadMoreCommentsResult } from '@/app/[locale]/(public)/topics/_lib/load-more-comments';
import { loadMoreCommentsBase } from '@/app/[locale]/(public)/topics/_lib/load-more-comments-base';
import { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';

import { chunkCommentThread } from '../_lib/comment-thread';

/**
 * Fetch + render the next comment-tree batch for `/chunks/[slug]`
 * (issue #81).
 *
 * `slug`, `locale` and `sort` are bound server-side at render time
 * (`loadMoreChunkComments.bind(null, slug, locale, sortBy)`), but arrive
 * over the wire like any action argument, so they are re-validated here.
 */
export async function loadMoreChunkComments(
  slug: string,
  locale: string,
  sort: string,
  offset: number
): Promise<LoadMoreCommentsResult> {
  return loadMoreCommentsBase({
    locale,
    sortBy: validateSort(sort),
    offset,
    topicType: 'chunk',
    resolveWiring: async ({ locale }) => {
      const chunk = await getChunkBySlug(slug);
      return chunk ? chunkCommentThread(locale, slug, chunk.representativeFen) : null;
    },
  });
}
