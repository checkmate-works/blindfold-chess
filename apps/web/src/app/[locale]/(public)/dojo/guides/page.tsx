/**
 * Guides Hub Top
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
import Link from 'next/link';

import { SITE_URL, SUPPORTED_LOCALES } from '@/config';
import enMessages from '@/messages/en.json';

import { buildGuidePath, enumerateGuideRoutes } from '@/lib/guides';
import { resolveCspNonce } from '@/lib/security/nonce';
import { JsonLd, generateItemListSchema } from '@/lib/seo/jsonld';

import { PageLayout } from '@/app/[locale]/_components';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { GuidePageFooter } from './_components/GuidePageFooter';
import { RankGuidesSection } from './_components/RankGuidesSection';

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.guides.top', path: 'dojo/guides' });
}

const sections = [{ id: 'rankGuides', Component: RankGuidesSection }] as const;

export default async function GuidesTopPage({ params }: LocalePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'guides' });
  const tRanks = await getTranslations({ locale, namespace: 'ranks' });
  const tDojo = await getTranslations({ locale, namespace: 'dojo' });

  // Build an ItemList of rank roots from the canonical i18n source so the
  // JSON-LD stays in sync with whatever the `RankGuidesSection` grid renders.
  const rankRoots = enumerateGuideRoutes(enMessages.guides.pages as Record<string, unknown>).filter(
    (r) => r.kind === 'root'
  );

  const itemListItems = rankRoots.map((route) => ({
    name: tRanks(`rankNames.${route.slug}`),
    url: `${SITE_URL}${buildGuidePath(locale, route.slug, { kind: 'root' })}`,
  }));

  const nonce = await resolveCspNonce();

  return (
    <>
      <JsonLd data={generateItemListSchema(itemListItems)} nonce={nonce} />
      <PageLayout title={t('top.title')} locale={locale}>
        <div className="space-y-10">
          {sections.map(({ id, Component }) => (
            <Component key={id} locale={locale} />
          ))}
        </div>

        {/* Reciprocal link back to the Dojo hub — beyond the breadcrumb in
            GuidePageFooter below, this gives a visible way back for readers
            who scrolled past it. */}
        <div className="flex justify-center">
          <Link href={`/${locale}/dojo`} className={`text-sm ${TEXT_LINK_CLASSES}`}>
            {tDojo('backToDojo')}
          </Link>
        </div>

        <GuidePageFooter
          items={[
            { label: t('breadcrumb.dojo'), href: '/dojo' },
            { label: t('breadcrumb.guides') },
          ]}
          locale={locale}
        />
      </PageLayout>
    </>
  );
}
