import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import {
  FaBrain,
  FaChess,
  FaChessBoard,
  FaChessKnight,
  FaCrosshairs,
  FaLightbulb,
  FaRoute,
  FaSignal,
  FaUndo,
} from 'react-icons/fa';

import {
  Breadcrumb,
  Divider,
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
              <div className="text-blue-500 text-xl flex justify-center">
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
              <div className="text-green-500 text-xl flex justify-center">
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
              <div className="text-amber-500 text-xl flex justify-center">
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

          <div className="flex justify-center pt-2">
            <Link
              href={`/${locale}/games/new`}
              className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              {t('whatYouCanDo.stockfish.cta')}
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
    </div>
  );
}
