import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { ListLink, ListLinkContainer, SectionTitle } from '@/app/[locale]/_components';

import { getLatestPublishedArticles } from '../../articles/_lib/queries';

const LATEST_ARTICLES_DISPLAY_COUNT = 5;

type Props = {
  locale: string;
  title: string;
};

export async function LatestArticlesList({ locale, title }: Props) {
  const articles = await getLatestPublishedArticles(locale, LATEST_ARTICLES_DISPLAY_COUNT + 1);
  const t = await getTranslations({ locale, namespace: 'articles' });

  if (articles.length === 0) {
    return null;
  }

  const hasMore = articles.length > LATEST_ARTICLES_DISPLAY_COUNT;
  const displayArticles = hasMore ? articles.slice(0, LATEST_ARTICLES_DISPLAY_COUNT) : articles;

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6 md:p-8 shadow-sm space-y-4">
      <SectionTitle>{title}</SectionTitle>
      <ListLinkContainer>
        {displayArticles.map((article) => {
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
      {hasMore && (
        <div className="text-center">
          <Link
            href="/articles"
            locale={locale}
            className="text-sm text-link-primary hover:text-link-primary/80 transition-colors"
          >
            {t('moreArticles')}
          </Link>
        </div>
      )}
    </div>
  );
}
