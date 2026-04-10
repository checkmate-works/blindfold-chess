import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core';

import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PositionMemorySession } from '../../_components/PositionMemorySession';
import { getMemoryPositionById } from '../../_lib/queries';
import {
  type SerializedResultItem,
  type SerializedStats,
  serializeResults,
  serializeStats,
} from '../../_lib/result-serde';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    id: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const MIN_TIME = 5;
const MAX_TIME = 60;
const DEFAULT_TIME_LIMIT = 30;

function clampTimeLimit(value: unknown): number {
  const num = typeof value === 'string' ? parseInt(value, 10) : NaN;
  if (isNaN(num)) return DEFAULT_TIME_LIMIT;
  return Math.max(MIN_TIME, Math.min(MAX_TIME, num));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/position-memory' }),
    title: resolveTitle(`${t('title')} - ${t('session')}`, locale),
  };
}

function buildSingleResultUrl(
  locale: Locale,
  positionId: string,
  timeLimit: number,
  results: SerializedResultItem[],
  stats: SerializedStats
): string {
  const first = results[0];
  const params = new URLSearchParams();
  // Preserve the original single-position result page behavior (`toFixed(1)` for score).
  params.set('score', (first?.a ?? 0).toFixed(1));
  params.set('total', '100');
  params.set('data', serializeResults(results));
  params.set('stats', serializeStats(stats));
  params.set('timeLimit', timeLimit.toString());

  return `/${locale}/practice/position-memory/${positionId}/result?${params.toString()}`;
}

export default async function PositionSessionPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const timeLimit = clampTimeLimit(sp.timeLimit);

  const position = await getMemoryPositionById(id);

  if (!position) {
    notFound();
  }

  const isBlackToMove = isBlackToMoveFromFen(position.fen);

  return (
    <PositionMemorySession
      locale={locale}
      timeLimit={timeLimit}
      shuffle={false}
      presetPositions={[{ fen: position.fen, isBlackToMove }]}
      enablePause
      skipBehavesAsQuit
      showSkipButton={false}
      skipProblemResult
      buildResultUrl={({ results, stats }) =>
        buildSingleResultUrl(locale, position.id, timeLimit, results, stats)
      }
    />
  );
}
