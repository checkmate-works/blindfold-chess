import { getTranslations } from 'next-intl/server';
import { getAllArticles } from './_lib/learn';
import { PageTitle, Breadcrumb, CardLink, Divider, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '../_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

// Icons for each article type
const articleIcons: Record<string, string> = {
  'algebraic-notation': '📝',
  'bishop-movement': '♗',
  'king-movement': '♔',
  'knight-movement': '♘',
  'rook-movement': '♜',
  'square-colors': '🏁',
  'position-memory': '🧠',
};

export default async function LearnPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const articles = await getAllArticles(locale);

  return (
    <div className="space-y-8">
      <PageTitle>{t('learn.title')}</PageTitle>

      <p className="text-muted-foreground">{t('learn.description')}</p>

      <Divider />

      <SectionTitle>{t('learn.articlesTitle')}</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <CardLink
            key={article.slug}
            href={`/learn/${article.slug}`}
            icon={articleIcons[article.slug] || '📚'}
            title={article.title}
            description={article.excerpt}
            locale={locale}
          />
        ))}
      </div>

      <Divider />

      <Breadcrumb items={[{ label: t('navigation.learn') }]} locale={locale} />
    </div>
  );
}
