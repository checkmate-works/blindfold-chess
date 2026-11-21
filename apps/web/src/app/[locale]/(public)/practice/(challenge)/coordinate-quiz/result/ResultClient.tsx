'use client';

import {
  createPracticeResultClient,
  formatAverageTimePerAnswer,
} from '@/app/[locale]/(public)/practice/_lib/createPracticeResultClient';

export const ResultClient = createPracticeResultClient({
  moduleSlug: 'coordinate-quiz',
  i18nKey: 'coordinateQuiz',
  extraParams: (sp) => ({
    orientation: sp.get('orientation'),
  }),
  buildTryAgainUrl: (ctx, extra) => {
    const params = new URLSearchParams();
    if (extra.orientation) params.set('orientation', extra.orientation);
    return `/${ctx.locale}/practice/coordinate-quiz/challenge/session?${params.toString()}`;
  },
  // No settings in the query here: the setup screen reads the stored ones,
  // which already hold whatever this run used.
  buildSettingsUrl: (ctx) => `/${ctx.locale}/practice/coordinate-quiz/challenge`,
  buildAverageTimeText: formatAverageTimePerAnswer,
});
