/**
 * Position Memory — Problem List
 *
 * @description
 * Displays a paginated list of user-submitted positions for the
 * position memory practice module. Each card shows a board thumbnail,
 * title, description excerpt, and author information.
 *
 * @flow
 * 1. Browse the list of available positions
 * 2. Click a card to navigate to the position detail page
 * 3. On the detail page, configure time limit and start a session
 *
 * A help tour (the `?` next to the page title) introduces the module: the
 * first step explains what position memory is and carries the tutorial link
 * (the standalone link above the sort control was folded into it); the second
 * step points at the Create Problem CTA and is shown only to signed-in users.
 *
 * The page body is shared with the puzzle list via `createPositionListPage` —
 * see that factory for the rendering logic.
 */
import { createPositionListPage } from '../_lib/create-position-list-page';

export const dynamic = 'force-dynamic';

const { generateMetadata, Page } = createPositionListPage({
  slug: 'position-memory',
  namespace: 'practice.positionMemory',
  positionType: 'memory',
  replyMetaType: 'position_memory',
  sortTranslationKey: 'topics.positionMemory.sort',
  tutorialPath: 'practice/position-memory/tutorial',
  nativeAdSlot: 'position-memory-list-native-ad',
});

export { generateMetadata };
export default Page;
