import { getTranslations } from 'next-intl/server';

import { eq } from 'drizzle-orm';

import { articleCategories, articleCategoryTranslations, db } from '@/lib/db';

import { NewArticleForm } from '../_components/NewArticleForm';

export default async function NewArticlePage() {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.articlesTable' });

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
    <NewArticleForm
      categories={categories}
      labels={{
        formTitle: t('form.createTitle'),
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
