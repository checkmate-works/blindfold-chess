import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageTitle, PageDescription, Breadcrumb, SectionTitle, Divider } from '../_components';
import { AlphabeticalIndex } from './_components/AlphabeticalIndex';
import { CategoryIndex } from './_components/CategoryIndex';
import type { Locale } from '../_lib/types';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ja' }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.glossary' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function GlossaryIndexPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'glossary' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PageDescription>{t('description')}</PageDescription>

      <div className="space-y-6">
        <SectionTitle>{t('index.alphabetical')}</SectionTitle>
        <AlphabeticalIndex locale={locale} />
      </div>

      <div className="space-y-6">
        <SectionTitle>{t('index.byCategory')}</SectionTitle>
        <CategoryIndex locale={locale} />
      </div>

      <Divider />

      <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
    </div>
  );
}
