import { getTranslations } from 'next-intl/server';

import { NewArticleForm } from '../_components/NewArticleForm';
import { getArticleFormLabels } from '../_lib/labels';
import { getArticleCategories } from '../_lib/queries';
import type { ContentFormat } from '../_lib/types';

const VALID_CONTENT_FORMATS: ContentFormat[] = ['markdown', 'tiptap_json'];

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.articlesTable' });
  const params = await searchParams;

  const categories = await getArticleCategories();

  const slug = typeof params.slug === 'string' ? params.slug : undefined;
  const locale = typeof params.locale === 'string' ? params.locale : undefined;
  const rawContentFormat =
    typeof params.contentFormat === 'string' ? params.contentFormat : undefined;
  const contentFormat =
    rawContentFormat && VALID_CONTENT_FORMATS.includes(rawContentFormat as ContentFormat)
      ? (rawContentFormat as ContentFormat)
      : undefined;

  return (
    <NewArticleForm
      categories={categories}
      labels={getArticleFormLabels(t, t('form.createTitle'))}
      defaultSlug={slug}
      defaultLocale={locale}
      contentFormat={contentFormat}
    />
  );
}
