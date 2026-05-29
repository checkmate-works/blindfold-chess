/**
 * Puzzle — Problem List
 *
 * @description
 * Displays a paginated list of user-submitted puzzle positions.
 * Each card shows a board thumbnail, title, description excerpt,
 * and author information.
 *
 * @flow
 * 1. Browse the list of available puzzles
 * 2. Click a card to navigate to the puzzle detail page (not yet implemented)
 * 3. On the detail page, attempt to find the best move(s)
 *
 * A help tour (the `?` next to the page title) introduces the module: the
 * first step explains what a puzzle is; the second points at the Create Puzzle
 * CTA and is shown only to signed-in users.
 *
 * The page body is shared with the position-memory list via
 * `createPositionListPage` — see that factory for the rendering logic.
 */
import { createPositionListPage } from '../_lib/create-position-list-page';

export const dynamic = 'force-dynamic';

const { generateMetadata, Page } = createPositionListPage({
  slug: 'puzzle',
  namespace: 'practice.puzzle',
  positionType: 'puzzle',
  replyMetaType: 'position_puzzle',
  sortTranslationKey: 'topics.positionPuzzle.sort',
});

export { generateMetadata };
export default Page;
