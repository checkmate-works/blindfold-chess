import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageTitle } from '../_components/PageTitle';
import { Breadcrumb } from '../_components/Breadcrumb';
import { AlphabeticalIndex } from './_components/AlphabeticalIndex';
import { CategoryIndex } from './_components/CategoryIndex';

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ja' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.glossary' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function GlossaryIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'glossary' });

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('title')}</PageTitle>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Alphabetical Index */}
      <div className="mb-12">
        <h2 className="text-lg font-bold text-foreground mb-6">{t('index.alphabetical')}</h2>
        <AlphabeticalIndex locale={locale} />
      </div>

      {/* Category Index */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-6">{t('index.byCategory')}</h2>
        <CategoryIndex locale={locale} />
      </div>

      {/* Breadcrumb at bottom */}
      <div className="mt-8 pt-6 border-t border-border">
        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </div>
    </>
  );
}
