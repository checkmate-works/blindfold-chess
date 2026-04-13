import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV, SITE_URL } from '@/config';

import { JsonLd, generateItemListSchema } from '@/lib/jsonld';

import {
  Divider,
  ListLink,
  ListLinkContainer,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPublishedArticleCount, getPublishedArticlesPaginated } from './_lib/queries';

export const revalidate = 300;

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
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.articles' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'articles', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function ArticlesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'articles' });

  const currentPage = Math.max(1, Number(page) || 1);
  const totalCount = await getPublishedArticleCount();
  const totalPages = Math.max(1, Math.ceil(totalCount / ARTICLES_PER_PAGE));

  if (currentPage > totalPages && totalPages > 0) {
    notFound();
  }

  const offset = (currentPage - 1) * ARTICLES_PER_PAGE;
  const articles = await getPublishedArticlesPaginated(locale, ARTICLES_PER_PAGE, offset);

  const itemListItems = articles.map((article) => ({
    name: article.title,
    url: `${SITE_URL}/${locale}/articles/${article.slug}`,
  }));

  return (
    <div className="space-y-8">
      <JsonLd data={generateItemListSchema(itemListItems)} />
      <PageTitle>{t('pageTitle')}</PageTitle>

      <PagePanel>
        {articles.length === 0 ? (
          <p className="text-muted-foreground">{t('noArticles')}</p>
        ) : (
          <>
            <SectionTitle>{t('articlesListTitle')}</SectionTitle>
            <ListLinkContainer>
              {articles.map((article) => {
                const publishedDate = article.publishedAt
                  ? new Date(article.publishedAt).toLocaleDateString(locale, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
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
              buildHref={(p) => `/${locale}/articles${p > 1 ? `?page=${p}` : ''}`}
            />
          </>
        )}

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}

        <Divider />

        <Breadcrumb items={[{ label: t('pageTitle') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
