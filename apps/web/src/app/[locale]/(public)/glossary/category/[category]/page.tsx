import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { CategoryIndex } from '../../_components/CategoryIndex';
import { GlossaryTermList } from '../../_components/GlossaryTermList';
import { getTermsByCategory } from '../../_lib/queries';
import { CATEGORY_STYLES, type GlossaryCategory } from '../../_lib/types';

export const revalidate = 3600;

type Props = {
  params: Promise<{
    locale: Locale;
    category: string;
  }>;
};

const VALID_CATEGORIES = Object.keys(CATEGORY_STYLES);

export function generateStaticParams(): { locale: Locale; category: string }[] {
  return SUPPORTED_LOCALES.flatMap((locale) =>
    VALID_CATEGORIES.map((category) => ({ locale, category }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'metadata.glossary.category' });

  // Get localized category name
  const categoryT = await getTranslations({ locale, namespace: 'glossary.categories' });
  const categoryName = categoryT(category);

  const title = t('title', { category: categoryName });
  const description = t('description', { category: categoryName });

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `glossary/category/${category}`,
      title: title,
      description,
    }),
    title: resolveTitle(title, locale),
    description,
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

  return (
    <div className="space-y-8">
      <PageTitle className="flex justify-center items-center gap-3">
        <span className="text-4xl text-muted-foreground">{categoryStyle.icon}</span>
        <span>{t(`categories.${category}`)}</span>
      </PageTitle>

      <PagePanel>
        <SectionTitle>{t('categoryPage.termsTitle')}</SectionTitle>

        <GlossaryTermList terms={filteredTerms} locale={locale} />

        <AdSlot slot="content-middle" />

        <SectionTitle>{t('categoryPage.categoriesTitle')}</SectionTitle>

        <CategoryIndex locale={locale} currentCategory={category} />

        <AdSlot slot="content-bottom" />

        {/* Mirror `PageLayout`'s trailing block — see PageLayout.tsx. The page
            uses a custom-styled `<PageTitle>` (icon + label flex layout) that
            doesn't fit the standard `PageLayout` shape, so the chrome is kept
            inline here while still applying the same compact breadcrumb gap. */}
        <div className="!mt-4 space-y-4">
          <Divider />
          <Breadcrumb
            items={[
              { label: t('title'), href: '/glossary' },
              { label: t(`categories.${category}`) },
            ]}
            locale={locale}
            density="compact"
          />
        </div>
      </PagePanel>
    </div>
  );
}
