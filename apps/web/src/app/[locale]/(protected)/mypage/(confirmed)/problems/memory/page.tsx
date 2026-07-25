/**
 * My Position Memory Problems (`/mypage/problems/memory`)
 *
 * @description
 * Lists position memory problems created by the authenticated user.
 * Provides a management view with board thumbnails, titles, descriptions,
 * and creation dates. Links to the public detail page for each position.
 *
 * @flow
 * 1. View paginated list of own positions (type: memory)
 * 2. Click a card to navigate to the public position detail page
 *
 * Shares its entire body with the Puzzle variant via `createMyProblemsPage`.
 */
import { createMyProblemsPage } from '../_lib/createMyProblemsPage';

const { generateMetadata, MyProblemsPage } = createMyProblemsPage({
  positionType: 'memory',
  replyMetaType: 'position_memory',
  listNamespace: 'MypageProblems',
  footerNamespace: 'practice.positionMemory',
  metadataNamespace: 'metadata.mypageProblems',
  pathSegment: 'memory',
  detailPathPrefix: 'position-memory',
});

export { generateMetadata };
export default MyProblemsPage;
