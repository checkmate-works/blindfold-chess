import { getTranslations } from 'next-intl/server';
import { getAllManualArticles } from './_lib/utils';
import { PageTitle, Breadcrumb, CardLink, Divider } from '@/app/[locale]/_components';
import type { Locale } from '../_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default async function ManualPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'manual' });
  const articles = await getAllManualArticles(locale);

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <p className="text-muted-foreground">{t('description')}</p>

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

      <Divider />

      <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
    </div>
  );
}
