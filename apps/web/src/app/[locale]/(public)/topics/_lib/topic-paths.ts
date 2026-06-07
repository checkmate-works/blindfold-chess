import { parseMoveTopicKey } from '@/lib/repertoires/move-topic-key';

import type { TopicType } from './constants';

/**
 * Resolve the public detail path that hosts a topic_post's discussion thread.
 *
 * Most topic types live under `/topics/<segment>/<key>`, but a few diverge:
 *   - 'chunk' lives under `/chunks/<slug>` (its catalog lives in `chunks`)
 *   - 'position_memory' lives under `/practice/position-memory/<id>`
 *   - 'position_puzzle' lives under `/practice/puzzle/<id>`
 *
 * Shared by `deletePost` and `editPost` so both invalidate the same path on
 * mutation. Returns the locale-prefixed absolute path; pass directly to
 * `revalidatePath` / `router.push`.
 */
export function buildTopicDetailPath(
  topicType: TopicType | string,
  topicKey: string,
  locale: string
): string {
  switch (topicType) {
    case 'chunk':
      return `/${locale}/chunks/${topicKey}`;
    case 'position_memory':
      return `/${locale}/practice/position-memory/${topicKey}`;
    case 'position_puzzle':
      return `/${locale}/practice/puzzle/${topicKey}`;
    case 'repertoire':
      return `/${locale}/repertoires/${topicKey}`;
    case 'repertoire_move': {
      // topicKey packs `${repertoireId}_${lineNo}_${ply}` — rebuild the nested
      // line path. No `?move` here: this feeds revalidatePath, which keys on the
      // path and would not match a query-bearing string. (Deep links that need
      // the focused move are built separately in the notification link helper.)
      const parsed = parseMoveTopicKey(topicKey);
      return parsed
        ? `/${locale}/repertoires/${parsed.repertoireId}/lines/${parsed.lineNo}`
        : `/${locale}/repertoires`;
    }
    case 'square':
      return `/${locale}/topics/squares/${topicKey}`;
    case 'opening':
      return `/${locale}/topics/openings/${topicKey}`;
    default:
      return `/${locale}/topics/${topicType}/${topicKey}`;
  }
}
