import { getTranslations } from 'next-intl/server';

import { AdminBreadcrumb } from '@/app/admin/_components/AdminBreadcrumb';

import { NewArticleForm } from '../_components/NewArticleForm';
import { getArticleFormLabels } from '../_lib/labels';
import { getArticleCategories } from '../_lib/queries';
import { CONTENT_FORMATS } from '../_lib/types';
import type { ContentFormat } from '../_lib/types';

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
    rawContentFormat && CONTENT_FORMATS.includes(rawContentFormat as ContentFormat)
      ? (rawContentFormat as ContentFormat)
      : undefined;

  return (
    <>
      <AdminBreadcrumb
        items={[{ label: t('title'), href: '/admin/articles' }, { label: t('form.createTitle') }]}
        className="mb-3"
      />
      <NewArticleForm
        categories={categories}
        labels={getArticleFormLabels(t, t('form.createTitle'))}
        defaultSlug={slug}
        defaultLocale={locale}
        contentFormat={contentFormat}
      />
    </>
  );
}
