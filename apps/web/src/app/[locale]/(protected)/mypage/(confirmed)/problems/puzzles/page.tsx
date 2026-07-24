/**
 * My Puzzles (`/mypage/problems/puzzles`)
 *
 * @description
 * Lists puzzle problems created by the authenticated user.
 * Provides a management view with board thumbnails, titles, descriptions,
 * and creation dates. Links to the public puzzle detail page for each position.
 *
 * @flow
 * 1. View paginated list of own positions (type: puzzle)
 * 2. Click a card to navigate to the public puzzle detail page
 *
 * Shares its entire body with the Position Memory variant via `createMyProblemsPage`.
 */
import { createMyProblemsPage } from '../_lib/createMyProblemsPage';

const { generateMetadata, MyProblemsPage } = createMyProblemsPage({
  positionType: 'puzzle',
  replyMetaType: 'position_puzzle',
  listNamespace: 'MypagePuzzles',
  footerNamespace: 'practice.puzzle',
  metadataNamespace: 'metadata.mypagePuzzles',
  pathSegment: 'puzzles',
  detailPathPrefix: 'puzzle',
});

export { generateMetadata };
export default MyProblemsPage;
