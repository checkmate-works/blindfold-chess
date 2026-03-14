import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { eq } from 'drizzle-orm';

import { articleCategories, articleCategoryTranslations, articles, db } from '@/lib/db';

import { EditArticleForm } from '../../_components/EditArticleForm';
import { formatDateTimeLocal } from '../../_lib/format';

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.articlesTable' });

  const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);

  if (!article) {
    notFound();
  }

  const categories = await db
    .select({
      id: articleCategories.id,
      name: articleCategoryTranslations.name,
    })
    .from(articleCategories)
    .innerJoin(
      articleCategoryTranslations,
      eq(articleCategoryTranslations.categoryId, articleCategories.id)
    )
    .where(eq(articleCategoryTranslations.locale, 'en'))
    .orderBy(articleCategories.displayOrder);

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
        draftSaved: t('form.draftSaved'),
        preview: t('form.preview'),
        cancel: t('form.cancel'),
        excerpt: t('form.excerpt'),
        excerptPlaceholder: t('form.excerptPlaceholder'),
        description: t('form.description'),
        descriptionPlaceholder: t('form.descriptionPlaceholder'),
        category: t('form.category'),
        categoryNone: t('form.categoryNone'),
        icon: t('form.icon'),
        iconPlaceholder: t('form.iconPlaceholder'),
        metadata: t('form.metadata'),
        tabEdit: t('form.tabEdit'),
        tabPreview: t('form.tabPreview'),
      }}
    />
  );
}
