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
    feedbackSpeed: sp.get('speed'),
  }),
  buildTryAgainUrl: (ctx, extra) => {
    const params = new URLSearchParams();
    if (extra.orientation) params.set('orientation', extra.orientation);
    if (extra.feedbackSpeed) params.set('feedbackSpeed', extra.feedbackSpeed);
    return `/${ctx.locale}/practice/coordinate-quiz/challenge/session?${params.toString()}`;
  },
  buildSettingsUrl: (ctx, extra) => {
    const params = new URLSearchParams();
    if (extra.orientation) params.set('orientation', extra.orientation);
    if (extra.feedbackSpeed) params.set('feedbackSpeed', extra.feedbackSpeed);
    return `/${ctx.locale}/practice/coordinate-quiz/challenge?${params.toString()}`;
  },
  buildAverageTimeText: formatAverageTimePerAnswer,
  extraCompleteProps: (_ctx, { adBannerWide }) => ({
    beforeRelatedContent: adBannerWide,
  }),
});
