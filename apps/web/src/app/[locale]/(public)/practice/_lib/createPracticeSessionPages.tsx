import type { ReactNode } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import { Divider, PageLayout, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
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
      title: resolveTitle(
        `${t(`practice.${config.i18nKey}.title`)} - ${t(`practice.${config.modeLabelKey}`)}`,
        locale
      ),
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
    const label =
      ns === 'navigation' ? t(`navigation.${seg.labelKey}`) : t(`practice.${seg.labelKey}`);
    return seg.href ? { label, href: seg.href } : { label };
  });
}

// ---------------------------------------------------------------------------
// Shared Page body for session-style pages (challenge, challenge session, training)
// ---------------------------------------------------------------------------

type SessionPageBodyConfig = {
  i18nKey: string;
  breadcrumbSegments: BreadcrumbSegment[];
  showDivider?: boolean;
  renderContent: (context: {
    locale: Locale;
    searchParams: Record<string, string | string[] | undefined>;
    t: Awaited<ReturnType<typeof getTranslations>>;
  }) => ReactNode;
};

async function renderSessionPage(props: LocaleSearchPageProps, config: SessionPageBodyConfig) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const searchParams = await props.searchParams;
  const t = await getTranslations({ locale });

  const breadcrumbItems = resolveBreadcrumbs(
    [
      { labelKey: 'practice', namespace: 'navigation', href: '/practice' },
      ...config.breadcrumbSegments,
    ],
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
    return renderSessionPage(props, config);
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
  const generateMetadata = async function generateMetadata({
    params,
  }: LocalePageProps): Promise<Metadata> {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale });

    return {
      ...generateCanonicalMetadata({ locale, path: config.canonicalPath }),
      title: resolveTitle(
        `${t(`practice.${config.i18nKey}.title`)} - ${t(`practice.${config.i18nKey}.${config.sessionLabelKey}`)}`,
        locale
      ),
      description: t(`practice.${config.i18nKey}.description`),
      ...(config.robots ? { robots: config.robots } : {}),
    };
  };

  const staticParams = config.staticParams !== false ? generateLocaleStaticParams : undefined;

  async function Page(props: LocaleSearchPageProps) {
    return renderSessionPage(props, config);
  }

  return { generateMetadata, generateStaticParams: staticParams, Page };
}

// ---------------------------------------------------------------------------
// Tutorial page factory
// ---------------------------------------------------------------------------

type TutorialPageConfig = {
  /** i18n key under "practice" namespace, e.g. "diagonalQuiz" */
  i18nKey: string;
  /** Canonical path without leading slash, e.g. "practice/diagonal-quiz/tutorial" */
  canonicalPath: string;
  /** Breadcrumb segments (excluding "Practice" which is always first) */
  breadcrumbSegments: BreadcrumbSegment[];
  /**
   * i18n key for the description in metadata.
   * Resolved as `practice.<i18nKey>.<descriptionKey>`.
   * Defaults to "description".
   */
  descriptionKey?: string;
  /** Whether to wrap the content in a PagePanel. Defaults to true. */
  usePagePanel?: boolean;
  /** Render the section title. Receives translation function. Defaults to SectionTitle with tutorial.title. */
  renderSectionTitle?: (t: Awaited<ReturnType<typeof getTranslations>>) => ReactNode;
  /** Render the tutorial skip link. Receives locale. */
  renderSkipLink: (locale: Locale) => ReactNode;
  /** Render the tutorial content. Receives locale. */
  renderTutorial: (locale: Locale) => ReactNode;
};

export function createPracticeTutorialPage(config: TutorialPageConfig) {
  const descriptionKey = config.descriptionKey ?? 'description';
  const usePagePanel = config.usePagePanel !== false;

  const generateMetadata = async function generateMetadata({
    params,
  }: LocalePageProps): Promise<Metadata> {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale });

    const title = `${t(`practice.${config.i18nKey}.title`)} - ${t(`practice.${config.i18nKey}.tutorial.title`)}`;
    const description = t(`practice.${config.i18nKey}.${descriptionKey}`);

    return {
      ...generateCanonicalMetadata({ locale, path: config.canonicalPath, title, description }),
      title: resolveTitle(title, locale),
      description,
    };
  };

  async function Page({ params }: LocalePageProps) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale });

    const breadcrumbItems = resolveBreadcrumbs(
      [
        { labelKey: 'practice', namespace: 'navigation', href: '/practice' },
        ...config.breadcrumbSegments,
      ],
      t
    );

    const sectionTitle = config.renderSectionTitle ? config.renderSectionTitle(t) : null;

    if (usePagePanel) {
      return (
        <PageLayout
          title={t(`practice.${config.i18nKey}.title`)}
          locale={locale}
          breadcrumb={breadcrumbItems}
        >
          {sectionTitle ?? (
            <SectionTitle>{t(`practice.${config.i18nKey}.tutorial.title`)}</SectionTitle>
          )}
          <div className="text-right">{config.renderSkipLink(locale)}</div>
          {config.renderTutorial(locale)}
        </PageLayout>
      );
    }

    return (
      <div className="space-y-8">
        <PageTitle>{t(`practice.${config.i18nKey}.title`)}</PageTitle>
        {sectionTitle ?? (
          <SectionTitle>{t(`practice.${config.i18nKey}.tutorial.title`)}</SectionTitle>
        )}
        <div className="text-right">{config.renderSkipLink(locale)}</div>
        {config.renderTutorial(locale)}
        <Divider />
        <Breadcrumb items={breadcrumbItems} locale={locale} />
      </div>
    );
  }

  return { generateMetadata, generateStaticParams: generateLocaleStaticParams, Page };
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
    return renderSessionPage(props, config);
  }

  return { generateMetadata, generateStaticParams: staticParams, Page };
}
