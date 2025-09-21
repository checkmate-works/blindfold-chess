import { getTranslations } from 'next-intl/server';
import { getAllManualArticles } from './_lib/manual';
import { PageTitle, Breadcrumb, CardLink } from '@/app/[locale]/_components';

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
          <CardLink
            key={article.slug}
            href={`/manual/${article.slug}`}
            icon="📖"
            title={article.title}
            description={article.excerpt}
            locale={locale}
          />
        ))}
      </div>

      {/* Breadcrumb at bottom */}
      <div className="mt-8 pt-6 border-t border-border">
        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </div>
    </>
  );
}
