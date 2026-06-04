import {
  getLikedPostCountByUser,
  getLikedPostsByUser,
} from '@/app/[locale]/(public)/topics/_lib/like-queries';

import { createMypageTopicPostListPage } from '../_lib/create-topic-post-list-page';

const { generateMetadata, Page } = createMypageTopicPostListPage({
  namespace: 'MypageLikes',
  metadataNamespace: 'metadata.mypageLikes',
  path: 'mypage/likes',
  loadCount: (userId) => getLikedPostCountByUser(userId),
  loadPosts: (userId, limit, offset) => getLikedPostsByUser(userId, limit, offset),
});

export { generateMetadata };
export default Page;
