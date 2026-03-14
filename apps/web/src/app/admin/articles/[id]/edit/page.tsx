import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { eq } from 'drizzle-orm';

import { articles, db } from '@/lib/db';

import { EditArticleForm } from '../../_components/EditArticleForm';
import { formatDateTimeLocal } from '../../_lib/format';

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.articlesTable' });

  const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);

  if (!article) {
    notFound();
  }

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
      }}
      labels={{
        formTitle: t('form.editTitle'),
        slug: t('form.slug'),
        slugPlaceholder: t('form.slugPlaceholder'),
        title: t('form.title'),
        titlePlaceholder: t('form.titlePlaceholder'),
        content: t('form.content'),
        contentPlaceholder: t('form.contentPlaceholder'),
        locale: t('form.locale'),
        saveDraft: t('form.saveDraft'),
        savingDraft: t('form.savingDraft'),
        preview: t('form.preview'),
        cancel: t('form.cancel'),
        backToList: t('form.backToList'),
      }}
    />
  );
}
