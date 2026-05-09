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
import { HelpTourButton } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';

import RoutePlanner from './_components/RoutePlanner';

export const revalidate = 300;

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'routePlanner',
  canonicalPath: 'practice/route-planner',
  renderSetup: (locale) => <RoutePlanner locale={locale} />,
  renderTitleAction: (t) => {
    const steps: HelpStep[] = [
      {
        targetId: 'route-planner-tutorial',
        title: t('practice.routePlanner.help.tutorial.title'),
        description: t('practice.routePlanner.help.tutorial.description'),
        side: 'top',
        align: 'center',
      },
      {
        targetId: 'route-planner-challenge',
        title: t('practice.routePlanner.help.challenge.title'),
        description: t('practice.routePlanner.help.challenge.description'),
        side: 'top',
        align: 'center',
      },
      {
        targetId: 'route-planner-training',
        title: t('practice.routePlanner.help.training.title'),
        description: t('practice.routePlanner.help.training.description'),
        side: 'top',
        align: 'center',
      },
    ];
    return <HelpTourButton steps={steps} label={t('practice.routePlanner.help.label')} />;
  },
  renderArticles: () => null,
  leaderboard: {
    module: 'route_planner',
    defaultKey: 'knight',
  },
});

export { generateMetadata };
export default Page;
