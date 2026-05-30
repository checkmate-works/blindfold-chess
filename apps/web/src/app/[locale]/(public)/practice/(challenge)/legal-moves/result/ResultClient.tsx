'use client';

import {
  createPracticeResultClient,
  formatAverageTimePerAnswer,
} from '@/app/[locale]/(public)/practice/_lib/createPracticeResultClient';

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
  buildAverageTimeText: formatAverageTimePerAnswer,
});
