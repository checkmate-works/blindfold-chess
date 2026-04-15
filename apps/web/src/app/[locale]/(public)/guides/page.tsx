/**
 * Guides Hub Top (ガイドハブ)
 *
 * @description
 * Top page of the guides SEO content hub. Lists available guide sections;
 * currently only rank guides exist, but the section layout is an array so
 * future additions (columns, tactics, etc.) can be added without refactoring.
 *
 * @flow
 * 1. Render a section header describing the guides hub.
 * 2. Iterate over the `sections` array and render each section component.
 * 3. Render breadcrumbs.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SITE_URL, SUPPORTED_LOCALES } from '@/config';
import enMessages from '@/messages/en.json';

import { buildGuidePath, enumerateGuideRoutes } from '@/lib/guides';
import { JsonLd, generateItemListSchema } from '@/lib/seo/jsonld';

import { PagePanel, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { GuidePageFooter } from './_components/GuidePageFooter';
import { RankGuidesSection } from './_components/RankGuidesSection';

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.guides.top' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'guides', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

const sections = [{ id: 'rankGuides', Component: RankGuidesSection }] as const;

export default async function GuidesTopPage({ params }: LocalePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'guides' });
  const tRanks = await getTranslations({ locale, namespace: 'ranks' });

  // Build an ItemList of rank roots from the canonical i18n source so the
  // JSON-LD stays in sync with whatever the `RankGuidesSection` grid renders.
  const rankRoots = enumerateGuideRoutes(enMessages.guides.pages as Record<string, unknown>).filter(
    (r) => r.kind === 'root'
  );

  const itemListItems = rankRoots.map((route) => ({
    name: tRanks(`rankNames.${route.slug}`),
    url: `${SITE_URL}${buildGuidePath(locale, route.slug, { kind: 'root' })}`,
  }));

  return (
    <div className="space-y-8">
      <JsonLd data={generateItemListSchema(itemListItems)} />

      <PageTitle>{t('top.title')}</PageTitle>

      <PagePanel>
        <div className="space-y-10">
          {sections.map(({ id, Component }) => (
            <Component key={id} locale={locale} />
          ))}
        </div>

        <GuidePageFooter items={[{ label: t('breadcrumb.guides') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
