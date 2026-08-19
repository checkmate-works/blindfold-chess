import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SITE_URL } from '@/config';

import { formatLocalDate } from '@/lib/i18n/format-date';
import { buildPageHref } from '@/lib/pagination';
import { getPaginationParams } from '@/lib/pagination';
import { JsonLd, generateItemListSchema } from '@/lib/seo/jsonld';

import { ListLink, ListLinkContainer, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPublishedArticleCount, getPublishedArticlesPaginated } from './_lib/queries';

export const revalidate = 1800;

const ARTICLES_PER_PAGE = 20;

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.articles', path: 'articles' });
}

export default async function ArticlesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'articles' });

  const totalCount = await getPublishedArticleCount();
  const { currentPage, totalPages, offset } = getPaginationParams(
    Number(page) || 1,
    totalCount,
    ARTICLES_PER_PAGE
  );

  if (currentPage > totalPages && totalPages > 0) {
    notFound();
  }
  const articles = await getPublishedArticlesPaginated(locale, ARTICLES_PER_PAGE, offset);

  const itemListItems = articles.map((article) => ({
    name: article.title,
    url: `${SITE_URL}/${locale}/articles/${article.slug}`,
  }));

  return (
    <>
      <JsonLd data={generateItemListSchema(itemListItems)} />
      <PageLayout title={t('pageTitle')} locale={locale} breadcrumb={[{ label: t('pageTitle') }]}>
        {articles.length === 0 ? (
          <p className="text-muted-foreground">{t('noArticles')}</p>
        ) : (
          <>
            <SectionTitle>{t('articlesListTitle')}</SectionTitle>
            <ListLinkContainer>
              {articles.map((article) => {
                const publishedDate = article.publishedAt
                  ? formatLocalDate(new Date(article.publishedAt), locale)
                  : undefined;

                return (
                  <ListLink
                    key={article.id}
                    href={`/articles/${article.slug}`}
                    icon="📰"
                    title={article.title}
                    meta={publishedDate}
                    locale={locale}
                    isPinned={article.pinnedAt !== null}
                  />
                );
              })}
            </ListLinkContainer>
            <PaginationNav
              currentPage={currentPage}
              totalPages={totalPages}
              buildHref={buildPageHref(`/${locale}/articles`)}
              locale={locale}
            />
          </>
        )}

        <AdSlot slot="content-bottom" />
      </PageLayout>
    </>
  );
}
