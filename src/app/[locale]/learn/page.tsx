import { getTranslations } from 'next-intl/server';
import { getAllArticles } from './_lib/learn';
import { PageTitle, Breadcrumb, CardLink } from '@/app/[locale]/_components';

interface LearnPageProps {
  params: Promise<{
    locale: 'en' | 'ja';
  }>;
}

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

export default async function LearnPage({ params }: LearnPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const articles = await getAllArticles(locale);

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('learn.title')}</PageTitle>
        <p className="text-muted-foreground">{t('learn.description')}</p>
      </div>

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

      {/* Breadcrumb at bottom */}
      <div className="mt-8 pt-6 border-t border-border">
        <Breadcrumb items={[{ label: t('navigation.learn') }]} locale={locale} />
      </div>
    </>
  );
}
