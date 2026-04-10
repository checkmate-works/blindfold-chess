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

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV, SUPPORTED_LOCALES } from '@/config';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

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

  return (
    <div className="space-y-8">
      <PageTitle>{t('top.title')}</PageTitle>

      <PagePanel>
        <div className="space-y-10">
          {sections.map(({ id, Component }) => (
            <Component key={id} locale={locale} />
          ))}
        </div>

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}

        <Divider />

        <Breadcrumb items={[{ label: t('breadcrumb.guides') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
