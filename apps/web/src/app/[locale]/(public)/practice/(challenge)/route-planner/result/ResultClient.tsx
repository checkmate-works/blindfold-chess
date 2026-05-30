'use client';

import { useMemo } from 'react';

import { useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import {
  createPracticeResultClient,
  formatAverageTimePerAnswer,
} from '@/app/[locale]/(public)/practice/_lib/createPracticeResultClient';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import {
  type RoutePlannerResult,
  RoutePlannerResultList,
} from '../_components/RoutePlannerResultList';

function RoutePlannerChildren() {
  const searchParams = useSearchParams();
  const { preferences, isLoaded } = useGamePreferences();
  const tPractice = useTranslations('practice');
  const dataParam = searchParams.get('data');

  const results = useMemo(() => {
    if (!dataParam) return [];
    try {
      const parsed = JSON.parse(decodeURIComponent(dataParam));
      return Array.isArray(parsed) ? (parsed as RoutePlannerResult[]) : [];
    } catch {
      return [];
    }
  }, [dataParam]);

  if (results.length === 0 || !isLoaded) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-muted-foreground mb-4">
        {tPractice('problemDetails')}
      </h3>
      <RoutePlannerResultList
        results={results}
        boardTheme={preferences.boardTheme}
        labels={{ skipped: tPractice('skip') }}
      />
    </div>
  );
}

function RelatedLinks({ locale }: { locale: Locale }) {
  const tPractice = useTranslations('practice');

  const relatedLinks = [
    {
      href: '/learn/moves/bishop-movement',
      icon: '♝',
      title: tPractice('legalMoves.articles.bishop.title'),
      description: tPractice('legalMoves.articles.bishop.description'),
    },
    {
      href: '/learn/moves/knight-movement',
      icon: '♞',
      title: tPractice('legalMoves.articles.knight.title'),
      description: tPractice('legalMoves.articles.knight.description'),
    },
  ];

  return (
    <div className="mt-8 space-y-3">
      <SectionTitle>{tPractice('relatedLearning')}</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {relatedLinks.map((link) => (
          <CardLink
            key={link.href}
            href={link.href}
            icon={link.icon}
            title={link.title}
            description={link.description}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}

/** Parse score/total from the data param (route-planner uses data-based scoring) */
function parseDataScores(searchParams: URLSearchParams) {
  const dataParam = searchParams.get('data');
  if (!dataParam) return { score: 0, total: 0 };
  try {
    const parsed = JSON.parse(decodeURIComponent(dataParam));
    const results = Array.isArray(parsed) ? parsed : [];
    const score = results.filter((r: RoutePlannerResult) => r.success).length;
    return { score, total: results.length };
  } catch {
    return { score: 0, total: 0 };
  }
}

export const ResultClient = createPracticeResultClient({
  moduleSlug: 'route-planner',
  i18nKey: 'routePlanner',
  containerClassName: 'space-y-8',
  tryAgainNavigation: 'reload',
  resolveScoreTotal: (sp) => parseDataScores(sp),
  extraParams: (sp) => ({
    piece: sp.get('piece'),
  }),
  buildTryAgainUrl: (ctx, extra) => {
    const params = new URLSearchParams();
    if (extra.piece) params.set('piece', extra.piece);
    return `/${ctx.locale}/practice/route-planner/challenge/session?${params.toString()}`;
  },
  buildSettingsUrl: (ctx) => `/${ctx.locale}/practice/route-planner`,
  buildAverageTimeText: formatAverageTimePerAnswer,
  renderChildren: () => <RoutePlannerChildren />,
  renderAfterComplete: (ctx) => <RelatedLinks locale={ctx.locale} />,
});
