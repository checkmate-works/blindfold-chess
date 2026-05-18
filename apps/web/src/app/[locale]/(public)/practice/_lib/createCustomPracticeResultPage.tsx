'use client';

import type { ReactNode } from 'react';

import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { ResultClientProps } from './createPracticeResultClient';

type CustomPracticeResultConfig = {
  /** Module slug used in URLs, e.g. 'knight-tour'. */
  moduleSlug: string;
  /** i18n sub-key under 'practice', e.g. 'knightTour'. */
  i18nKey: string;
  /** i18n key for the page title. Defaults to 'title'. */
  titleKey?: string;
  /**
   * Source of the first breadcrumb label. 'practice' uses `tPractice('title')`,
   * 'navigation' uses `tNavigation('practice')`. Defaults to 'practice'.
   */
  practiceBreadcrumbSource?: 'practice' | 'navigation';
  /** Optional className for the PracticeResultPage container. */
  containerClassName?: string;
  /** Optional className for the PracticeResultPage divider. */
  dividerClassName?: string;
  /** Validate the locale against SUPPORTED_LOCALES and `notFound()` if invalid. */
  validateLocale?: boolean;
  /** Render the entire result body. */
  renderContent: (args: { locale: Locale; adBanner?: ReactNode }) => ReactNode;
};

/**
 * Factory for practice result pages that render a fully custom body instead of
 * the standard `PracticeComplete` + leaderboard + ads layout (currently just
 * knight-tour). It provides only the shared `PracticeResultPage` shell with
 * breadcrumbs and hands the rest to `renderContent`.
 *
 * Split out from `createPracticeResultClient`, where a `renderContent` config
 * key made the factory branch into two unrelated components — one that scored
 * a quiz and one that rendered arbitrary content. Each factory now builds one
 * kind of page.
 */
export function createCustomPracticeResultPage(config: CustomPracticeResultConfig) {
  const {
    moduleSlug,
    i18nKey,
    titleKey = 'title',
    practiceBreadcrumbSource = 'practice',
    containerClassName,
    dividerClassName,
    validateLocale = false,
    renderContent,
  } = config;

  function ResultClient({ locale, adBanner, adBannerStandard }: ResultClientProps) {
    const t = useTranslations(`practice.${i18nKey}`);
    const tPractice = useTranslations('practice');
    const tNavigation = useTranslations('navigation');

    if (validateLocale && !(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
      notFound();
    }

    const practiceBreadcrumbLabel =
      practiceBreadcrumbSource === 'navigation' ? tNavigation('practice') : tPractice('title');

    return (
      <PracticeResultPage
        locale={locale}
        title={t(titleKey)}
        breadcrumbItems={[
          { label: practiceBreadcrumbLabel, href: '/practice' },
          { label: t('title'), href: `/practice/${moduleSlug}` },
          { label: tPractice('result') },
        ]}
        containerClassName={containerClassName}
        dividerClassName={dividerClassName}
      >
        {renderContent({ locale, adBanner })}
        {adBannerStandard && <div className="mt-8">{adBannerStandard}</div>}
      </PracticeResultPage>
    );
  }

  ResultClient.displayName = `CustomResultClient(${moduleSlug})`;
  return ResultClient;
}
