import { createPracticeTopPage } from '../_lib/createPracticeTopPage';
import RoutePlanner from './_components/RoutePlanner';

export const dynamic = 'force-dynamic';

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'routePlanner',
  canonicalPath: 'practice/route-planner',
  renderSetup: (locale) => <RoutePlanner locale={locale} />,
  renderArticles: () => null,
});

export { generateMetadata };
export default Page;
