'use client';

import { type ReactNode, useMemo } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { ExpInfo } from '@blindfold-chess/features/exp';

import { ChessBoardWithOverlay } from '@/app/[locale]/(public)/practice/(free-play)/_components/ChessBoardWithOverlay';
import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import { ExpGainDisplay } from '@/app/[locale]/(public)/practice/_components/ExpGainDisplay';
import { SegmentedProgressBar } from '@/app/[locale]/(public)/practice/_components/SegmentedProgressBar';
import { CardLink, Divider, PagePanel, SectionTitle } from '@/app/[locale]/_components';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { calculateSquareDifferences } from '../../_lib/preset-problems';
import { parseResults, parseStats } from '../../_lib/result-serde';
import type { PositionAccuracy } from '../../_lib/types';

type Props = {
  locale: Locale;
  positionId: string;
  adBannerStandard?: ReactNode;
  breadcrumb?: ReactNode;
  expInfo?: ExpInfo | null;
};

export function SinglePositionResult({
  locale,
  positionId,
  adBannerStandard,
  breadcrumb,
  expInfo,
}: Props) {
  const searchParams = useSearchParams();
  const t = useTranslations('practice.positionMemory');
  const { preferences } = useGamePreferences();

  const score = parseFloat(searchParams.get('score') || '0');
  const timeLimit = searchParams.get('timeLimit') || '30';

  const resultItem = useMemo(() => {
    const parsed = parseResults(searchParams.get('data'));
    return parsed.length > 0 ? parsed[0] : null;
  }, [searchParams]);
  const stats = useMemo(() => parseStats(searchParams.get('stats')), [searchParams]);

  const squareDifferences = useMemo(() => {
    if (!resultItem) return [];
    return calculateSquareDifferences(resultItem.fen, resultItem.recreatedFen);
  }, [resultItem]);

  const isBlackToMove = resultItem ? resultItem.isBlackToMove : false;
  const isSkipped = resultItem ? resultItem.skipped : false;

  const accuracy: PositionAccuracy | null = stats
    ? {
        correctPieces: stats.correctPieces,
        totalPieces: stats.totalPieces,
        incorrectPieces: stats.incorrectPieces,
        missingPieces: stats.missingPieces,
        extraPieces: stats.extraPieces,
        netScore: stats.correctPieces - (stats.incorrectPieces + stats.extraPieces) * 0.5,
        accuracy: score,
        details: [],
      }
    : null;

  return (
    <div className="space-y-8">
      <PagePanel>
        <div className="space-y-6">
          <SectionTitle>{t('result')}</SectionTitle>

          {/* Accuracy Title */}
          <h2 className="text-2xl font-bold text-center">
            {t('accuracy')}: {score.toFixed(1)}%
            {stats && ` (${stats.correctPieces}/${stats.totalPieces})`}
          </h2>

          {/* Skipped notice */}
          {isSkipped && <p className="text-center text-muted-foreground text-sm">{t('skipped')}</p>}

          {/* Progress bar */}
          {accuracy && !isSkipped && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {t('recreationProgress')}
              </p>
              <SegmentedProgressBar
                segments={[
                  {
                    key: 'correct',
                    value: accuracy.correctPieces,
                    color: 'bg-success',
                    label: t('correct'),
                  },
                  {
                    key: 'incorrect',
                    value: accuracy.incorrectPieces,
                    color: 'bg-destructive',
                    label: t('incorrect'),
                  },
                  {
                    key: 'missing',
                    value: accuracy.missingPieces,
                    color: 'bg-muted-foreground/40',
                    label: t('missing'),
                  },
                ]}
                total={accuracy.totalPieces}
              />
              {accuracy.extraPieces > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  {t('extra')}: <span className="font-semibold">+{accuracy.extraPieces}</span> (
                  {t('extraDescription')})
                </p>
              )}
            </div>
          )}

          {/* Board comparison */}
          {resultItem && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">{t('original')}</p>
                <div className="w-full max-w-xs mx-auto">
                  <AnimatedChessBoard
                    initialFen={resultItem.fen}
                    showCoordinates={false}
                    flipped={isBlackToMove}
                    boardTheme={preferences.boardTheme}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {t('yourRecreation')}
                </p>
                <div className="w-full max-w-xs mx-auto">
                  <ChessBoardWithOverlay
                    fen={resultItem.recreatedFen || '8/8/8/8/8/8/8/8 w - - 0 1'}
                    flipped={isBlackToMove}
                    squareDifferences={squareDifferences}
                    boardTheme={preferences.boardTheme}
                  />
                </div>
              </div>
            </div>
          )}

          {/* EXP gained — placed after the board comparison (all result
              content) and immediately before the action buttons, per user
              preference for the position-memory single-position layout. */}
          {expInfo && <ExpGainDisplay expInfo={expInfo} />}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href={`/${locale}/practice/position-memory/${positionId}/session?timeLimit=${timeLimit}`}
              className="block"
            >
              <Button variant="primary" size="lg" fullWidth>
                {t('detail.tryAgain')}
              </Button>
            </Link>
            <Link href={`/${locale}/practice/position-memory`} className="block">
              <Button variant="secondary" size="lg" fullWidth>
                {t('detail.backToList')}
              </Button>
            </Link>
          </div>

          {/* Required Knowledge */}
          <div className="mt-8 space-y-4">
            <SectionTitle>{t('requiredKnowledge')}</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CardLink
                href="/learn/memory/position-memory"
                icon="🧠"
                title={t('articles.positionMemory.title')}
                description={t('articles.positionMemory.description')}
                locale={locale}
              />
              <CardLink
                href="/learn/memory/de-groot-experiment"
                icon="🧪"
                title={t('articles.deGrootExperiment.title')}
                description={t('articles.deGrootExperiment.description')}
                locale={locale}
              />
            </div>
          </div>

          {adBannerStandard && <div className="mt-8">{adBannerStandard}</div>}
        </div>

        {breadcrumb && (
          <>
            <Divider />
            {breadcrumb}
          </>
        )}
      </PagePanel>
    </div>
  );
}
