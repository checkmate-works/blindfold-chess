import { articles } from '@/lib/db';

import { createAdminSlugGroupListPage } from '../_components/AdminSlugGroupListPage';

export default createAdminSlugGroupListPage({
  table: articles,
  translationNamespace: 'Admin.articlesTable',
  basePath: '/admin/articles',
  newButtonTranslationKey: 'newArticle',
  emptyMessageKey: 'noArticlesFound',
});
