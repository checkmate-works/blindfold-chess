import {
  getPostCountByUserId,
  getPostsByUserId,
} from '@/app/[locale]/(public)/topics/_lib/user-post-queries';

import { createMypageTopicPostListPage } from '../_lib/create-topic-post-list-page';

const { generateMetadata, Page } = createMypageTopicPostListPage({
  namespace: 'MypagePosts',
  metadataNamespace: 'metadata.mypagePosts',
  path: 'mypage/posts',
  loadCount: (userId) => getPostCountByUserId(userId),
  loadPosts: (userId, limit, offset) => getPostsByUserId(userId, userId, limit, offset),
});

export { generateMetadata };
export default Page;
