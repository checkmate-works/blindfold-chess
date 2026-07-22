import {
  PUZZLE_ROUTE,
  createPositionEditRequestNewPage,
} from '@/app/[locale]/(public)/practice/(free-play)/_lib/create-position-route-pages';

export const dynamic = 'force-dynamic';

const { generateMetadata, Page } = createPositionEditRequestNewPage(PUZZLE_ROUTE);

export { generateMetadata };
export default Page;
