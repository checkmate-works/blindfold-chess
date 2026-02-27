import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { ChessBoard } from '@/app/_components';
import {
  FaBrain,
  FaChess,
  FaChessBoard,
  FaChessKnight,
  FaCrosshairs,
  FaLightbulb,
  FaRoute,
  FaSignal,
  FaSlidersH,
  FaUndo,
} from 'react-icons/fa';

import {
  Breadcrumb,
  Divider,
  PagePanel,
  PageTitle,
  SectionTitle,
  SubsectionTitle,
} from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

export const dynamic = 'force-static';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'gettingStarted' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'getting-started' }),
    title: t('title'),
    description: t('description'),
  };
}

const trainingCategories = [
  { key: 'positionMemory' as const, icon: <FaBrain /> },
  { key: 'knightTour' as const, icon: <FaChessKnight /> },
  { key: 'coordinateQuiz' as const, icon: <FaCrosshairs /> },
  { key: 'squareColors' as const, icon: <FaChessBoard /> },
  { key: 'legalMoves' as const, icon: <FaChess /> },
  { key: 'routePlanner' as const, icon: <FaRoute /> },
];

export default async function GettingStartedPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'gettingStarted' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel className="space-y-8 lg:space-y-12">
        {/* Why Blindfold Chess? */}
        <section className="space-y-4">
          <SectionTitle>{t('whyBlindfoldChess.title')}</SectionTitle>
          <p className="text-foreground font-semibold">{t('whyBlindfoldChess.intro')}</p>
          <p className="text-muted-foreground">{t('whyBlindfoldChess.explanation')}</p>
          <p className="text-muted-foreground">{t('whyBlindfoldChess.abilitiesIntro')}</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>{t('whyBlindfoldChess.ability1')}</li>
            <li>{t('whyBlindfoldChess.ability2')}</li>
            <li>{t('whyBlindfoldChess.ability3')}</li>
          </ul>
          <p className="text-muted-foreground">{t('whyBlindfoldChess.conclusion')}</p>
        </section>

        {/* What You Can Do Here */}
        <section className="space-y-6">
          <SectionTitle>{t('whatYouCanDo.title')}</SectionTitle>

          {/* Play Against Stockfish */}
          <div className="space-y-4">
            <SubsectionTitle>{t('whatYouCanDo.stockfish.title')}</SubsectionTitle>
            <p className="text-muted-foreground">{t('whatYouCanDo.stockfish.description')}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-lg p-4 text-center space-y-2">
                <div className="text-info text-xl flex justify-center">
                  <FaSignal />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {t('whatYouCanDo.stockfish.featureDifficulty')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('whatYouCanDo.stockfish.featureDifficultyDesc')}
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center space-y-2">
                <div className="text-success text-xl flex justify-center">
                  <FaUndo />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {t('whatYouCanDo.stockfish.featureUndo')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('whatYouCanDo.stockfish.featureUndoDesc')}
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center space-y-2">
                <div className="text-warning text-xl flex justify-center">
                  <FaLightbulb />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {t('whatYouCanDo.stockfish.featureHelp')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('whatYouCanDo.stockfish.featureHelpDesc')}
                </p>
              </div>
            </div>

            {/* Onboarding Banner */}
            <Link
              href={`/${locale}/onboarding`}
              className="block rounded-lg border border-primary/20 bg-primary/5 p-5 transition-colors hover:bg-primary/10"
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5 text-xl text-primary">
                  <FaSlidersH />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">
                    {t('onboardingBanner.title')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('onboardingBanner.description')}
                  </p>
                  <span className="inline-flex items-center text-sm font-medium text-primary">
                    {t('onboardingBanner.cta')} &rarr;
                  </span>
                </div>
              </div>
            </Link>

            <div className="flex justify-center pt-2">
              <Link
                href={`/${locale}/games/new`}
                className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                {t('whatYouCanDo.stockfish.cta')}
              </Link>
            </div>

            {/* Try a Simple Position */}
            <p className="text-muted-foreground">
              {t('whatYouCanDo.stockfish.trySimpleDescription')}
            </p>
            <div className="flex flex-col items-center gap-4">
              <div className="w-64 sm:w-72">
                <ChessBoard fen="6k1/8/8/3KQ3/8/8/8/8 w - - 0 1" showCoordinates={false} />
              </div>
              <Link
                href={`/${locale}/games/new/position?fen=${encodeURIComponent('6k1/8/8/3KQ3/8/8/8/8 w - - 0 1')}`}
                className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                {t('whatYouCanDo.stockfish.trySimpleCta')}
              </Link>
            </div>
          </div>

          {/* Rich Training Menu */}
          <div className="space-y-4">
            <SubsectionTitle>{t('whatYouCanDo.training.title')}</SubsectionTitle>
            <p className="text-muted-foreground">{t('whatYouCanDo.training.description')}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {trainingCategories.map(({ key, icon }) => (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card p-3"
                >
                  <span className="text-primary text-lg">{icon}</span>
                  <span className="text-sm text-foreground">
                    {t(`whatYouCanDo.training.categories.${key}`)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-2">
              <Link
                href={`/${locale}/practice`}
                className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                {t('whatYouCanDo.training.cta')}
              </Link>
            </div>
          </div>
        </section>

        <Divider />

        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
