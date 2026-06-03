import { Suspense } from 'react';
import type { ReactNode } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getOptionalUser } from '@/lib/auth';
import { getMaiaEngineAccess } from '@/lib/users/can-use-maia';
import type { MaiaEngineAccess } from '@/lib/users/can-use-maia';

import { PageLayout } from '@/app/[locale]/_components';
import { type HelpStep, HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GameLimitCheck } from '../_components/GameLimitCheck';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

type TranslationFn = (key: string) => string;

type CreateNewGamePageConfig = {
  /** Root-namespace i18n key for the page + metadata title (e.g. `newGame.pgnPageTitle`). */
  titleKey: string;
  /** Canonical metadata path (e.g. `games/new/pgn`). */
  path: string;
  /** Build the help-tour steps from the `newGame`-namespace translator. */
  buildHelpSteps: (tNewGame: TranslationFn) => HelpStep[];
  /** Render the engine-backed form for this mode. */
  renderForm: (args: { locale: Locale; maiaAccess: MaiaEngineAccess }) => ReactNode;
};

/**
 * Builds a `games/new/<mode>` page for the engine-backed modes (standard,
 * pgn, position). These pages are identical apart from their title, help-tour
 * steps, and the form component: each resolves the viewer's Maia entitlement,
 * then renders the form inside GameLimitCheck + Suspense.
 *
 * `generateStaticParams` is retained for metadata pre-render, but the page
 * reads cookies (auth state for the Maia entitlement check), so Next.js
 * switches to dynamic rendering at runtime — the desired behaviour, since the
 * form renders different UI per user.
 *
 * The opening mode is intentionally NOT built here: it has no Maia check,
 * loads the openings catalog, and renders without Suspense.
 */
export function createNewGamePage(config: CreateNewGamePageConfig) {
  const generateStaticParams = generateLocaleStaticParams;
  const dynamic = 'force-dynamic';

  async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale });

    const title = t(config.titleKey);

    return {
      ...generateCanonicalMetadata({ locale, path: config.path, title }),
      title: resolveTitle(title, locale),
    };
  }

  async function Page({ params }: Props) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale });
    const tNewGame = await getTranslations({ locale, namespace: 'newGame' });
    const tGames = await getTranslations({ locale, namespace: 'gamesPage' });

    const user = await getOptionalUser();
    const maiaAccess = await getMaiaEngineAccess(user?.id ?? null);

    const helpSteps = config.buildHelpSteps(tNewGame);

    return (
      <PageLayout
        title={t(config.titleKey)}
        titleAction={<HelpTourButton steps={helpSteps} label={tNewGame('helpLabel')} />}
        locale={locale}
        breadcrumb={[
          { label: tGames('pageTitle'), href: '/games' },
          { label: t('newGame.title'), href: '/games/new' },
          { label: t(config.titleKey) },
        ]}
      >
        <GameLimitCheck locale={locale}>
          <Suspense fallback={null}>{config.renderForm({ locale, maiaAccess })}</Suspense>
        </GameLimitCheck>
      </PageLayout>
    );
  }

  return { generateStaticParams, dynamic, generateMetadata, Page };
}
