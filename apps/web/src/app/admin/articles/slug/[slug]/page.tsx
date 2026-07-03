import { createAdminSlugDetailPage } from '@/app/admin/_components/AdminSlugDetailPage';
import { eq } from 'drizzle-orm';

import { type Article, articles, db } from '@/lib/db';

import { DeleteArticleButton } from '../../_components/DeleteArticleButton';

async function getArticlesBySlug(slug: string): Promise<Article[]> {
  return db.select().from(articles).where(eq(articles.slug, slug)).orderBy(articles.locale);
}

export default createAdminSlugDetailPage({
  fetchBySlug: getArticlesBySlug,
  translationNamespace: 'Admin.articlesTable',
  basePath: '/admin/articles',
  publicPathSegment: 'articles',
  emptyMessageKey: 'slugDetail.noArticlesFound',
  DeleteButton: DeleteArticleButton,
  // Use the content format of existing variants so new variants match
  extraCreateParams: (articleList) => ({
    contentFormat: articleList[0]?.contentFormat ?? 'tiptap_json',
  }),
});
