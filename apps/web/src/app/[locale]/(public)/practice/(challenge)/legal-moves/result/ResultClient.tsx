'use client';

import { createPracticeResultClient } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultClient';

export const ResultClient = createPracticeResultClient({
  moduleSlug: 'legal-moves',
  i18nKey: 'legalMoves',
  containerClassName: 'space-y-8',
  dividerClassName: 'my-8',
  practiceBreadcrumbSource: 'navigation',
  tryAgainNavigation: 'reload',
  extraParams: (sp) => ({
    piece: sp.get('piece'),
  }),
  buildTryAgainUrl: (ctx, extra) => {
    const params = new URLSearchParams();
    if (extra.piece) params.set('piece', extra.piece);
    return `/${ctx.locale}/practice/legal-moves/challenge/session?${params.toString()}`;
  },
  buildSettingsUrl: (ctx, extra) => {
    const params = new URLSearchParams();
    if (extra.piece) params.set('piece', extra.piece);
    return `/${ctx.locale}/practice/legal-moves/challenge?${params.toString()}`;
  },
  buildAverageTimeText: (ctx) => {
    const avg = ctx.total > 0 ? (ctx.timeElapsed / ctx.total).toFixed(1) : '0.0';
    return ctx.tPractice('secondsFormat', { seconds: avg });
  },
  labelOverrides: (ctx) => ({
    recreationProgress: ctx.t('accuracy'),
    correct: ctx.t('correct'),
    incorrect: ctx.t('incorrect'),
  }),
});
