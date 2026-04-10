import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { and, eq, isNull } from 'drizzle-orm';

import { db, positions } from '@/lib/db';
import { UUID_RE } from '@/lib/validations/uuid';

import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SinglePositionSession } from '../../_components/SinglePositionSession';

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

async function getPosition(id: string) {
  if (!UUID_RE.test(id)) return null;

  const [row] = await db
    .select({ id: positions.id, fen: positions.fen })
    .from(positions)
    .where(and(eq(positions.id, id), eq(positions.type, 'memory'), isNull(positions.deletedAt)))
    .limit(1);

  return row ?? null;
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

export default async function PositionSessionPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const timeLimit = clampTimeLimit(sp.timeLimit);

  const position = await getPosition(id);

  if (!position) {
    notFound();
  }

  return (
    <SinglePositionSession
      locale={locale}
      positionId={position.id}
      fen={position.fen}
      timeLimit={timeLimit}
    />
  );
}
