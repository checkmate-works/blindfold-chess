/**
 * Route Planner (`/practice/route-planner`)
 *
 * @description
 * Practice module in which the user finds a path from a starting square to a
 * target square using a specified piece. Trains the ability to understand how
 * each piece moves and to compute shortest routes. Supports multiple piece
 * types, such as knight and bishop.
 *
 * @flow
 * - Tutorial: redirects first-time visitors to the tutorial (skippable; the
 *   skip state is remembered in localStorage).
 * - Setup: the user selects a piece type and starts training.
 * - Training: the piece, starting square, and target square are presented;
 *   the user answers by inputting the intermediate squares.
 * - Result: shows correctness feedback and the shortest route, then advances
 *   to the next problem.
 */
import { createPracticeTopPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeTopPage';

import RoutePlanner from './_components/RoutePlanner';

export const revalidate = 300;

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'routePlanner',
  canonicalPath: 'practice/route-planner',
  renderSetup: (locale) => <RoutePlanner locale={locale} />,
  renderArticles: () => null,
  leaderboard: {
    module: 'route_planner',
    defaultKey: 'knight',
  },
});

export { generateMetadata };
export default Page;
