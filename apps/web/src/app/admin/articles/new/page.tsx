import { getTranslations } from 'next-intl/server';

import { NewArticleForm } from '../_components/NewArticleForm';

export default async function NewArticlePage() {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.articlesTable' });

  return (
    <NewArticleForm
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
        preview: t('form.preview'),
        cancel: t('form.cancel'),
        backToList: t('form.backToList'),
      }}
    />
  );
}
