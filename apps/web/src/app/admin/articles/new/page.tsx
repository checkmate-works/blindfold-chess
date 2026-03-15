import { getTranslations } from 'next-intl/server';

import { NewArticleForm } from '../_components/NewArticleForm';
import { getArticleFormLabels } from '../_lib/labels';
import { getArticleCategories } from '../_lib/queries';

export default async function NewArticlePage() {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.articlesTable' });

  const categories = await getArticleCategories();

  return (
    <NewArticleForm
      categories={categories}
      labels={getArticleFormLabels(t, t('form.createTitle'))}
    />
  );
}
