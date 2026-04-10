'use client';

import { useMemo } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ChessBoardWithOverlay } from '@/app/[locale]/(public)/practice/(free-play)/_components/ChessBoardWithOverlay';
import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import { SegmentedProgressBar } from '@/app/[locale]/(public)/practice/_components/SegmentedProgressBar';
import { PagePanel } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { PositionAccuracy } from '../_lib/types';
import { calculateSquareDifferences } from '../_lib/utils';

type Props = {
  locale: Locale;
  positionId: string;
};

interface ResultItem {
  f: string;
  r: string;
  b: number;
  a: number;
  c: number;
  t: number;
  i: number;
  m: number;
  e: number;
  o: number;
  s: number;
}

function parseResultData(dataParam: string | null): ResultItem | null {
  if (!dataParam) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(dataParam));
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0] as ResultItem;
    }
    return null;
  } catch {
    return null;
  }
}

function parseStats(statsParam: string | null) {
  if (!statsParam) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(statsParam));
    return {
      correctPieces: parsed.c as number,
      totalPieces: parsed.t as number,
      incorrectPieces: parsed.i as number,
      missingPieces: parsed.m as number,
      extraPieces: parsed.e as number,
    };
  } catch {
    return null;
  }
}

export function SinglePositionResult({ locale, positionId }: Props) {
  const searchParams = useSearchParams();
  const t = useTranslations('practice.positionMemory');

  const score = parseFloat(searchParams.get('score') || '0');
  const timeLimit = searchParams.get('timeLimit') || '30';

  const resultItem = useMemo(() => parseResultData(searchParams.get('data')), [searchParams]);
  const stats = useMemo(() => parseStats(searchParams.get('stats')), [searchParams]);

  const squareDifferences = useMemo(() => {
    if (!resultItem) return [];
    return calculateSquareDifferences(resultItem.f, resultItem.r);
  }, [resultItem]);

  const isBlackToMove = resultItem ? resultItem.b === 1 : false;
  const isSkipped = resultItem ? resultItem.s === 1 : false;

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
                    initialFen={resultItem.f}
                    showCoordinates={false}
                    flipped={isBlackToMove}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {t('yourRecreation')}
                </p>
                <div className="w-full max-w-xs mx-auto">
                  <ChessBoardWithOverlay
                    fen={resultItem.r || '8/8/8/8/8/8/8/8 w - - 0 1'}
                    flipped={isBlackToMove}
                    squareDifferences={squareDifferences}
                  />
                </div>
              </div>
            </div>
          )}

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
        </div>
      </PagePanel>
    </div>
  );
}
