import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import {
  Divider,
  ListLink,
  ListLinkContainer,
  PagePanel,
  PageTitle,
  PaginationNav,
} from '@/app/[locale]/_components';
import { AdBanner } from '@/app/[locale]/_components/AdBanner';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPublishedArticleCount, getPublishedArticlesPaginated } from './_lib/queries';

export const dynamic = 'force-dynamic';

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
  const t = await getTranslations({ locale, namespace: 'articles' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'articles' }),
    title: t('pageTitle'),
    description: t('pageDescription'),
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

  return (
    <div className="space-y-12">
      <header>
        <PageTitle>{t('pageTitle')}</PageTitle>
      </header>

      <PagePanel>
        {articles.length === 0 ? (
          <p className="text-muted-foreground">{t('noArticles')}</p>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-foreground">{t('articlesListTitle')}</h2>
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

        <AdBanner slot="banner-standard" locale={locale} />

        <Divider />

        <Breadcrumb items={[{ label: t('pageTitle') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
