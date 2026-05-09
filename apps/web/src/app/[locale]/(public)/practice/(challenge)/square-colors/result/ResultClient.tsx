'use client';

import { createPracticeResultClient } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultClient';

export const ResultClient = createPracticeResultClient({
  moduleSlug: 'square-colors',
  i18nKey: 'squareColors',
  containerClassName: 'space-y-8',
  validateLocale: true,
  buildSettingsUrl: (ctx) => `/${ctx.locale}/practice/square-colors/challenge`,
  buildTryAgainUrl: (ctx) => `/${ctx.locale}/practice/square-colors/challenge/session`,
  extraCompleteProps: (_ctx, { adBannerWide }) => ({
    beforeRelatedContent: adBannerWide,
  }),
});
