import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { eq } from 'drizzle-orm';

import { articles, db } from '@/lib/db';

import { formatDateTimeLocal } from '../../../_lib/format';
import { EditArticleForm } from '../../_components/EditArticleForm';
import { getArticleFormLabels } from '../../_lib/labels';
import { getArticleCategories } from '../../_lib/queries';
import type { ContentFormat, TiptapJsonContent } from '../../_lib/types';

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.articlesTable' });

  const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);

  if (!article) {
    notFound();
  }

  const categories = await getArticleCategories();

  return (
    <EditArticleForm
      id={article.id}
      defaultValues={{
        slug: article.slug,
        title: article.title,
        content: article.content,
        contentJson: (article.contentJson as TiptapJsonContent) ?? null,
        contentFormat: (article.contentFormat as ContentFormat) ?? 'markdown',
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
      labels={getArticleFormLabels(t, t('form.editTitle'))}
    />
  );
}
