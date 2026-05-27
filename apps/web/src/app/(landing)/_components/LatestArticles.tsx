import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { FaBookOpen } from 'react-icons/fa';

import { getLatestPublishedArticles } from '@/app/[locale]/(public)/articles/_lib/queries';
import { ListLink, ListLinkContainer, SectionTitle } from '@/app/[locale]/_components';

type Props = {
  locale: string;
};

export async function LatestArticles({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'landing' });
  const articles = await getLatestPublishedArticles(locale, 4);

  if (articles.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-2">
        <FaBookOpen className="text-primary h-5 w-5 mb-2" />
        <SectionTitle className="flex-1 mb-2">{t('dashboard.articles')}</SectionTitle>
      </div>
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
              locale={locale}
              icon="📰"
              title={article.title}
              meta={publishedDate}
              isPinned={article.pinnedAt !== null}
            />
          );
        })}
      </ListLinkContainer>
      <div className="mt-4 text-right">
        <Link
          href="/articles"
          locale={locale}
          className="text-sm text-primary hover:underline font-medium"
        >
          {t('dashboard.viewAll')}
        </Link>
      </div>
    </div>
  );
}
