'use server';

import { getRepertoireById } from '@/lib/repertoires/queries';
import { isValidUUID } from '@/lib/validations/uuid';

import type { LoadMoreCommentsResult } from '@/app/[locale]/(public)/topics/_lib/load-more-comments';
import { loadMoreCommentsBase } from '@/app/[locale]/(public)/topics/_lib/load-more-comments-base';
import { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';

import { repertoireCommentThread } from '../_lib/comment-thread';

/**
 * Fetch + render the next comment-tree batch for `/repertoires/[id]`
 * (issue #81).
 *
 * `repertoireId`, `locale` and `sort` are bound server-side at render time
 * (`loadMoreRepertoireComments.bind(null, repertoireId, locale, sortBy)`),
 * but arrive over the wire like any action argument, so they are
 * re-validated here.
 */
export async function loadMoreRepertoireComments(
  repertoireId: string,
  locale: string,
  sort: string,
  offset: number
): Promise<LoadMoreCommentsResult> {
  return loadMoreCommentsBase({
    locale,
    sortBy: validateSort(sort),
    offset,
    topicType: 'repertoire',
    resolveWiring: async ({ locale }) => {
      // Malformed key, or the repertoire was deleted between render and click.
      if (!isValidUUID(repertoireId) || !(await getRepertoireById(repertoireId))) return null;
      return repertoireCommentThread(locale, repertoireId);
    },
  });
}
