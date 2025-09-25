import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getArticle, getAvailableArticles } from '../_lib/learn';
import { Breadcrumb, MarkdownRenderer, CardLink, PageTitle } from '@/app/[locale]/_components';

interface LearnArticlePageProps {
  params: Promise<{
    locale: 'en' | 'ja';
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const slugs = getAvailableArticles();
  const locales = ['en', 'ja'] as const;

  return slugs.flatMap((slug) =>
    locales.map((locale) => ({
      locale,
      slug,
    }))
  );
}

// Mapping of learn articles to practice modules
const practiceModules: Record<string, Array<{ module: string; icon: string }>> = {
  'algebraic-notation': [
    { module: 'algebraic-notation', icon: '📝' },
    { module: 'coordinate-quiz', icon: '🎯' },
  ],
  'bishop-movement': [{ module: 'legal-moves', icon: '♗' }],
  'king-movement': [{ module: 'legal-moves', icon: '♔' }],
  'knight-movement': [{ module: 'legal-moves', icon: '♘' }],
  'rook-movement': [{ module: 'legal-moves', icon: '♜' }],
  'square-colors': [{ module: 'square-colors', icon: '🏁' }],
  'position-memory': [{ module: 'position-memory', icon: '🧠' }],
};

export default async function LearnArticlePage({ params }: LearnArticlePageProps) {
  const { locale, slug } = await params;
  const article = await getArticle(slug, locale);
  const t = await getTranslations({ locale });

  if (!article) {
    notFound();
  }

  return (
    <>
      {/* Page Title */}
      <div className="mb-8">
        <PageTitle>{article.metadata.title}</PageTitle>
      </div>

      {/* Article Content */}
      <article className="prose prose-slate dark:prose-invert max-w-none">
        <MarkdownRenderer content={article.content} skipFirstH1={true} />
      </article>

      {/* Practice link if available */}
      {practiceModules[slug] && (
        <div className="mt-12 p-6 bg-secondary/30 rounded-lg border border-border">
          <h2 className="text-xl font-semibold mb-4">{t('learn.practiceYourSkills')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {practiceModules[slug].map((practice) => {
              // Handle special cases for module naming
              const moduleKey =
                practice.module === 'coordinate-quiz'
                  ? 'coordinateQuiz'
                  : practice.module === 'legal-moves'
                    ? 'legalMoves'
                    : practice.module === 'position-memory'
                      ? 'positionMemory'
                      : practice.module === 'square-colors'
                        ? 'squareColors'
                        : practice.module === 'algebraic-notation'
                          ? 'algebraicNotation'
                          : practice.module;

              return (
                <CardLink
                  key={practice.module}
                  href={`/practice/${practice.module}`}
                  icon={practice.icon}
                  title={t(`practice.${moduleKey}.title`)}
                  description={t(`practice.${moduleKey}.description`)}
                  locale={locale}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Breadcrumb at bottom */}
      <div className="mt-12 pt-6 border-t border-border">
        <Breadcrumb
          items={[
            { label: t('navigation.learn'), href: '/learn' },
            { label: article.metadata.title },
          ]}
          locale={locale}
        />
      </div>
    </>
  );
}
