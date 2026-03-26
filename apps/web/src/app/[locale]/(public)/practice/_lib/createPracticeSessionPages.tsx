import type { ReactNode } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale, LocalePageProps, LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

// ---------------------------------------------------------------------------
// Shared metadata factory
// ---------------------------------------------------------------------------

type MetadataConfig = {
  /** i18n key under "practice" namespace, e.g. "coordinateQuiz" */
  i18nKey: string;
  /** Canonical path without leading slash, e.g. "practice/coordinate-quiz/challenge" */
  canonicalPath: string;
  /** i18n key for the mode label, e.g. "modeTimed" or "modeTraining" */
  modeLabelKey: string;
  /** Optional robots meta tag override */
  robots?: Metadata['robots'];
};

function createPracticeSessionMetadata(config: MetadataConfig) {
  return async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale });

    return {
      ...generateCanonicalMetadata({ locale, path: config.canonicalPath }),
      title: `${t(`practice.${config.i18nKey}.title`)} - ${t(`practice.${config.modeLabelKey}`)}`,
      description: t(`practice.${config.i18nKey}.description`),
      ...(config.robots ? { robots: config.robots } : {}),
    };
  };
}

// ---------------------------------------------------------------------------
// Breadcrumb segment types
// ---------------------------------------------------------------------------

type BreadcrumbSegment = {
  /** i18n key for the label (resolved under "practice" or "navigation" namespace) */
  labelKey: string;
  /** Namespace to look up the labelKey. Defaults to "practice". */
  namespace?: 'practice' | 'navigation';
  /** Optional href for the breadcrumb link */
  href?: string;
};

function resolveBreadcrumbs(
  segments: BreadcrumbSegment[],
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  return segments.map((seg) => {
    const ns = seg.namespace ?? 'practice';
    const label = ns === 'navigation' ? t(`navigation.${seg.labelKey}`) : t(`practice.${seg.labelKey}`);
    return seg.href ? { label, href: seg.href } : { label };
  });
}

// ---------------------------------------------------------------------------
// Challenge page factory
// ---------------------------------------------------------------------------

type ChallengePageConfig = {
  /** i18n key under "practice" namespace, e.g. "coordinateQuiz" */
  i18nKey: string;
  /** Canonical path, e.g. "practice/coordinate-quiz/challenge" */
  canonicalPath: string;
  /** Breadcrumb segments (excluding "Practice" which is always first) */
  breadcrumbSegments: BreadcrumbSegment[];
  /** Whether to export generateStaticParams. Defaults to true. */
  staticParams?: boolean;
  /** Optional robots meta tag override */
  robots?: Metadata['robots'];
  /** Whether to show the divider in PracticeSessionPage. Defaults to true. */
  showDivider?: boolean;
  /** Render the inner component. Receives locale and resolved searchParams. */
  renderContent: (context: {
    locale: Locale;
    searchParams: Record<string, string | string[] | undefined>;
    t: Awaited<ReturnType<typeof getTranslations>>;
  }) => ReactNode;
};

export function createPracticeChallengePage(config: ChallengePageConfig) {
  const generateMetadata = createPracticeSessionMetadata({
    i18nKey: config.i18nKey,
    canonicalPath: config.canonicalPath,
    modeLabelKey: 'modeTimed',
    robots: config.robots,
  });

  const staticParams = config.staticParams !== false ? generateLocaleStaticParams : undefined;

  async function Page(props: LocaleSearchPageProps) {
    const { locale } = await props.params;
    setRequestLocale(locale);
    const searchParams = await props.searchParams;
    const t = await getTranslations({ locale });

    const breadcrumbItems = resolveBreadcrumbs(
      [{ labelKey: 'practice', namespace: 'navigation', href: '/practice' }, ...config.breadcrumbSegments],
      t
    );

    return (
      <PracticeSessionPage
        locale={locale}
        title={t(`practice.${config.i18nKey}.title`)}
        breadcrumbItems={breadcrumbItems}
        {...(config.showDivider !== undefined ? { showDivider: config.showDivider } : {})}
      >
        {config.renderContent({ locale, searchParams, t })}
      </PracticeSessionPage>
    );
  }

  return { generateMetadata, generateStaticParams: staticParams, Page };
}

// ---------------------------------------------------------------------------
// Challenge session page factory
// ---------------------------------------------------------------------------

type ChallengeSessionPageConfig = {
  /** i18n key under "practice" namespace, e.g. "coordinateQuiz" */
  i18nKey: string;
  /** Canonical path, e.g. "practice/coordinate-quiz/challenge/session" */
  canonicalPath: string;
  /** i18n key for the session label (resolved as practice.<i18nKey>.<sessionLabelKey>) */
  sessionLabelKey: string;
  /** Breadcrumb segments (excluding "Practice" which is always first) */
  breadcrumbSegments: BreadcrumbSegment[];
  /** Whether to export generateStaticParams. Defaults to true. */
  staticParams?: boolean;
  /** Optional robots meta tag override */
  robots?: Metadata['robots'];
  /** Whether to show the divider in PracticeSessionPage. Defaults to true. */
  showDivider?: boolean;
  /** Render the inner component. */
  renderContent: (context: {
    locale: Locale;
    searchParams: Record<string, string | string[] | undefined>;
    t: Awaited<ReturnType<typeof getTranslations>>;
  }) => ReactNode;
};

export function createPracticeChallengeSessionPage(config: ChallengeSessionPageConfig) {
  const generateMetadata = async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale });

    return {
      ...generateCanonicalMetadata({ locale, path: config.canonicalPath }),
      title: `${t(`practice.${config.i18nKey}.title`)} - ${t(`practice.${config.i18nKey}.${config.sessionLabelKey}`)}`,
      description: t(`practice.${config.i18nKey}.description`),
      ...(config.robots ? { robots: config.robots } : {}),
    };
  };

  const staticParams = config.staticParams !== false ? generateLocaleStaticParams : undefined;

  async function Page(props: LocaleSearchPageProps) {
    const { locale } = await props.params;
    setRequestLocale(locale);
    const searchParams = await props.searchParams;
    const t = await getTranslations({ locale });

    const breadcrumbItems = resolveBreadcrumbs(
      [{ labelKey: 'practice', namespace: 'navigation', href: '/practice' }, ...config.breadcrumbSegments],
      t
    );

    return (
      <PracticeSessionPage
        locale={locale}
        title={t(`practice.${config.i18nKey}.title`)}
        breadcrumbItems={breadcrumbItems}
        {...(config.showDivider !== undefined ? { showDivider: config.showDivider } : {})}
      >
        {config.renderContent({ locale, searchParams, t })}
      </PracticeSessionPage>
    );
  }

  return { generateMetadata, generateStaticParams: staticParams, Page };
}

// ---------------------------------------------------------------------------
// Training page factory
// ---------------------------------------------------------------------------

type TrainingPageConfig = {
  /** i18n key under "practice" namespace, e.g. "coordinateQuiz" */
  i18nKey: string;
  /** Canonical path, e.g. "practice/coordinate-quiz/training" */
  canonicalPath: string;
  /** Breadcrumb segments (excluding "Practice" which is always first) */
  breadcrumbSegments: BreadcrumbSegment[];
  /** Whether to export generateStaticParams. Defaults to true. */
  staticParams?: boolean;
  /** Optional robots meta tag override */
  robots?: Metadata['robots'];
  /** Whether to show the divider in PracticeSessionPage. Defaults to true. */
  showDivider?: boolean;
  /** Render the inner component. */
  renderContent: (context: {
    locale: Locale;
    searchParams: Record<string, string | string[] | undefined>;
    t: Awaited<ReturnType<typeof getTranslations>>;
  }) => ReactNode;
};

export function createPracticeTrainingPage(config: TrainingPageConfig) {
  const generateMetadata = createPracticeSessionMetadata({
    i18nKey: config.i18nKey,
    canonicalPath: config.canonicalPath,
    modeLabelKey: 'modeTraining',
    robots: config.robots,
  });

  const staticParams = config.staticParams !== false ? generateLocaleStaticParams : undefined;

  async function Page(props: LocaleSearchPageProps) {
    const { locale } = await props.params;
    setRequestLocale(locale);
    const searchParams = await props.searchParams;
    const t = await getTranslations({ locale });

    const breadcrumbItems = resolveBreadcrumbs(
      [{ labelKey: 'practice', namespace: 'navigation', href: '/practice' }, ...config.breadcrumbSegments],
      t
    );

    return (
      <PracticeSessionPage
        locale={locale}
        title={t(`practice.${config.i18nKey}.title`)}
        breadcrumbItems={breadcrumbItems}
        {...(config.showDivider !== undefined ? { showDivider: config.showDivider } : {})}
      >
        {config.renderContent({ locale, searchParams, t })}
      </PracticeSessionPage>
    );
  }

  return { generateMetadata, generateStaticParams: staticParams, Page };
}
