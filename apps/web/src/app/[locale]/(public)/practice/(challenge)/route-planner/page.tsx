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
 * - Setup: the user selects a piece type and starts training. A "View
 *   Tutorial" link is offered for first-time visitors; the help tour on this
 *   page also recommends viewing the tutorial first.
 * - Training: the piece, starting square, and target square are presented;
 *   the user answers by inputting the intermediate squares.
 * - Result: shows correctness feedback and the shortest route, then advances
 *   to the next problem.
 */
import { createPracticeTopPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeTopPage';
import { buildPracticeHelpTour } from '@/app/[locale]/(public)/practice/_lib/practice-help-tour';

import RoutePlanner from './_components/RoutePlanner';

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'routePlanner',
  canonicalPath: 'practice/route-planner',
  renderSetup: (locale) => <RoutePlanner locale={locale} />,
  renderTitleAction: (t) =>
    buildPracticeHelpTour(t, 'routePlanner', 'route-planner', [
      'tutorial',
      'challenge',
      'training',
    ]),
  renderArticles: () => null,
  leaderboard: {
    module: 'route_planner',
    defaultKey: 'knight',
  },
});

export { generateMetadata };
export default Page;
