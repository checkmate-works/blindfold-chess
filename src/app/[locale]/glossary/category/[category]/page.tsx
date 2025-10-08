import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import {
  Breadcrumb,
  Divider,
  PageDescription,
  PageTitle,
  SectionTitle,
} from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { CategoryIndex } from '../../_components/CategoryIndex';
import { GlossaryTermList } from '../../_components/GlossaryTermList';
import { CATEGORY_STYLES } from '../../_lib/types';
import { getTermsByCategory } from '../../_lib/utils';

type Props = {
  params: Promise<{
    locale: Locale;
    category: string;
  }>;
};

const VALID_CATEGORIES = Object.keys(CATEGORY_STYLES);

export async function generateStaticParams() {
  return VALID_CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
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
  const t = await getTranslations({ locale, namespace: 'glossary' });

  if (!VALID_CATEGORIES.includes(category)) {
    notFound();
  }

  const filteredTerms = getTermsByCategory(category);
  const categoryStyle = CATEGORY_STYLES[category];

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <span className="text-4xl">{categoryStyle.icon}</span>
        <div>
          <PageTitle>{t(`categories.${category}`)}</PageTitle>
          <PageDescription>
            {t('categoryPage.count', { count: filteredTerms.length })}
          </PageDescription>
        </div>
      </div>

      <SectionTitle>{t('categoryPage.termsTitle')}</SectionTitle>

      <GlossaryTermList terms={filteredTerms} locale={locale} />

      <Divider />

      <SectionTitle>{t('categoryPage.categoriesTitle')}</SectionTitle>

      <CategoryIndex locale={locale} currentCategory={category} />

      <Divider />

      <Breadcrumb
        items={[{ label: t('title'), href: '/glossary' }, { label: t(`categories.${category}`) }]}
        locale={locale}
      />
    </div>
  );
}
