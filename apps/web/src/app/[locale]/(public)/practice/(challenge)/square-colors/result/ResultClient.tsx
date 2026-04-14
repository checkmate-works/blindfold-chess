'use client';

import { createPracticeResultClient } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultClient';

export const ResultClient = createPracticeResultClient({
  moduleSlug: 'square-colors',
  i18nKey: 'squareColors',
  containerClassName: 'space-y-8',
  validateLocale: true,
  buildSettingsUrl: (ctx) => `/${ctx.locale}/practice/square-colors/challenge`,
  buildTryAgainUrl: (ctx) => `/${ctx.locale}/practice/square-colors/challenge/session`,
  labelOverrides: (ctx) => ({
    recreationProgress: ctx.t('accuracy'),
    averageTime: ctx.t('averageTime'),
    correct: ctx.t('correct'),
    incorrect: ctx.t('incorrect'),
  }),
  extraCompleteProps: (_ctx, { adBannerWide }) => ({
    beforeRelatedContent: adBannerWide,
  }),
});
