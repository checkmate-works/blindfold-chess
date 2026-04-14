'use client';

import { createPracticeResultClient } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultClient';

export const ResultClient = createPracticeResultClient({
  moduleSlug: 'board-symmetry',
  i18nKey: 'boardSymmetry',
  containerClassName: 'space-y-8',
  validateLocale: true,
  buildTryAgainUrl: (ctx) => `/${ctx.locale}/practice/board-symmetry/challenge/session`,
  buildSettingsUrl: (ctx) => `/${ctx.locale}/practice/board-symmetry`,
  extraCompleteProps: (_ctx, { adBannerWide }) => ({
    beforeRelatedContent: adBannerWide,
  }),
});
