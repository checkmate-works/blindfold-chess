import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { shouldShowAds } from '@/lib/ad';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdBanner } from '@/app/[locale]/_components/AdBanner';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { CategoryIndex } from '../../_components/CategoryIndex';
import { GlossaryTermList } from '../../_components/GlossaryTermList';
import { getTermsByCategory } from '../../_lib/queries';
import { CATEGORY_STYLES, type GlossaryCategory } from '../../_lib/types';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    category: string;
  }>;
};

const VALID_CATEGORIES = Object.keys(CATEGORY_STYLES);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'metadata.glossary.category' });

  // Get localized category name
  const categoryT = await getTranslations({ locale, namespace: 'glossary.categories' });
  const categoryName = categoryT(category);

  return {
    ...generateCanonicalMetadata({ locale, path: `glossary/category/${category}` }),
    title: t('title', { category: categoryName }),
    description: t('description', { category: categoryName }),
  };
}

export default async function GlossaryCategoryPage({ params }: Props) {
  const { locale, category } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'glossary' });

  if (!VALID_CATEGORIES.includes(category)) {
    notFound();
  }

  const filteredTerms = await getTermsByCategory(category, locale);
  const categoryStyle = CATEGORY_STYLES[category as GlossaryCategory];
  const showAds = await shouldShowAds();

  return (
    <div className="space-y-8">
      <PageTitle className="flex justify-center items-center gap-3">
        <span className="text-4xl text-muted-foreground">{categoryStyle.icon}</span>
        <span>{t(`categories.${category}`)}</span>
      </PageTitle>

      <PagePanel>
        <SectionTitle>{t('categoryPage.termsTitle')}</SectionTitle>

        <GlossaryTermList terms={filteredTerms} locale={locale} />

        {showAds && <AdBanner slot="banner-wide" locale={locale} />}

        <SectionTitle>{t('categoryPage.categoriesTitle')}</SectionTitle>

        <CategoryIndex locale={locale} currentCategory={category} />

        {showAds && <AdBanner slot="banner-standard" locale={locale} />}

        <Divider />

        <Breadcrumb
          items={[{ label: t('title'), href: '/glossary' }, { label: t(`categories.${category}`) }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
