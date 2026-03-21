import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { eq } from 'drizzle-orm';

import { articleImages, articles, db } from '@/lib/db';

import { formatDateTimeLocal } from '../../../_lib/format';
import { EditArticleForm } from '../../_components/EditArticleForm';
import { getArticleFormLabels } from '../../_lib/labels';
import { getArticleCategories } from '../../_lib/queries';

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.articlesTable' });

  const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);

  if (!article) {
    notFound();
  }

  const [categories, images] = await Promise.all([
    getArticleCategories(),
    db.select().from(articleImages).where(eq(articleImages.articleId, id)),
  ]);

  return (
    <EditArticleForm
      id={article.id}
      defaultValues={{
        slug: article.slug,
        title: article.title,
        content: article.content,
        locale: article.locale,
        status: article.status ?? 'draft',
        pinnedAt: formatDateTimeLocal(article.pinnedAt),
        publishedAt: formatDateTimeLocal(article.publishedAt),
        excerpt: article.excerpt ?? '',
        description: article.description ?? '',
        categoryId: article.categoryId ?? '',
        icon: article.icon ?? '',
      }}
      categories={categories}
      images={images}
      labels={getArticleFormLabels(t, t('form.editTitle'))}
    />
  );
}
