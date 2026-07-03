/**
 * Forks of a Puzzle (`/practice/puzzle/[id]/forks`)
 *
 * @description
 * Paginated listing of every fork that descends from a single puzzle row.
 * Linked from the detail page's header note ("N forks") whenever the
 * source has at least one descendant. Returns 404 when the source itself
 * is missing or has been soft-deleted — orphan forks can still be viewed
 * from their own detail pages, but the parent-rooted listing requires a
 * live parent to make sense as a destination.
 *
 * The page body is shared with the position-memory forks listing via
 * `createPositionForksPage` — see that factory for the rendering logic.
 */
import {
  PUZZLE_ROUTE,
  createPositionForksPage,
} from '@/app/[locale]/(public)/practice/(free-play)/_lib/create-position-route-pages';

const { generateMetadata, Page } = createPositionForksPage(PUZZLE_ROUTE);

export { generateMetadata };
export default Page;
