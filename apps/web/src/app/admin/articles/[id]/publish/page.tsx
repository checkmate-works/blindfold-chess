import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { eq } from 'drizzle-orm';

import { articles, db } from '@/lib/db';

import { AdminPageHeader } from '../../../_components/AdminPageHeader';
import { formatDateTimeLocal } from '../../../_lib/format';
import { ArticlePublishForm } from '../../_components/ArticlePublishForm';
import type { ContentFormat, TiptapJsonContent } from '../../_lib/types';

export default async function PublishArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.articlesTable' });

  const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);

  if (!article) {
    notFound();
  }

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[
          { label: t('title'), href: '/admin/articles' },
          { label: article.title, href: `/admin/articles/${article.id}/edit` },
          { label: t('form.publishTitle') },
        ]}
      />

      <ArticlePublishForm
        id={article.id}
        slug={article.slug}
        articleData={{
          slug: article.slug,
          title: article.title,
          content: article.content,
          contentJson: (article.contentJson as TiptapJsonContent) ?? null,
          contentFormat: (article.contentFormat as ContentFormat) ?? 'markdown',
          locale: article.locale,
          excerpt: article.excerpt ?? null,
          description: article.description ?? null,
          categoryId: article.categoryId ?? null,
          icon: article.icon ?? null,
        }}
        defaultValues={{
          pinnedAt: formatDateTimeLocal(article.pinnedAt) ?? '',
          publishedAt: formatDateTimeLocal(article.publishedAt) ?? '',
        }}
        labels={{
          pinnedAt: t('form.pinnedAt'),
          publishedAt: t('form.publishedAt'),
          publish: t('form.publish'),
          publishing: t('form.publishing'),
          published: t('form.published'),
          backToEdit: t('form.backToEdit'),
        }}
      />
    </div>
  );
}
