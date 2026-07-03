/**
 * Forks of a Position Memory entry (`/practice/position-memory/[id]/forks`)
 *
 * @description
 * Mirror of the puzzle /forks page for the position-memory route. Paginated
 * listing of every fork that descends from a single position-memory row;
 * linked from the detail page's header note ("N forks") whenever the
 * source has at least one descendant. 404 when the source row is missing
 * or has been soft-deleted.
 *
 * The page body is shared with the puzzle forks listing via
 * `createPositionForksPage` — see that factory for the rendering logic.
 */
import {
  POSITION_MEMORY_ROUTE,
  createPositionForksPage,
} from '@/app/[locale]/(public)/practice/(free-play)/_lib/create-position-route-pages';

const { generateMetadata, Page } = createPositionForksPage(POSITION_MEMORY_ROUTE);

export { generateMetadata };
export default Page;
