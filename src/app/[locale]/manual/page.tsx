import { getTranslations } from 'next-intl/server';
import { getAllManualArticles } from '@/lib/manual';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { Link } from '@/i18n/routing';

interface ManualPageProps {
  params: Promise<{
    locale: 'en' | 'ja';
  }>;
}

export default async function ManualPage({ params }: ManualPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'manual' });
  const articles = await getAllManualArticles(locale);

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('title')}</PageTitle>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/manual/${article.slug}`}
            locale={locale}
            className="group block p-6 bg-card rounded-xl shadow-sm border border-border transition-all hover:shadow-md hover:border-foreground/20"
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl">📖</span>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {article.title}
                </h2>
                <p className="text-sm text-muted-foreground line-clamp-3">{article.excerpt}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Breadcrumb at bottom */}
      <div className="mt-8 pt-6 border-t border-border">
        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </div>
    </>
  );
}
