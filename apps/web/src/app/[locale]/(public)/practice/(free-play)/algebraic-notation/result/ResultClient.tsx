'use client';

import { createPracticeResultClient } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultClient';

export const ResultClient = createPracticeResultClient({
  moduleSlug: 'algebraic-notation',
  i18nKey: 'algebraicNotation',
  titleKey: 'pageTitle',
  buildTryAgainUrl: (ctx) =>
    `/${ctx.locale}/practice/algebraic-notation/session#algebraic-notation-session`,
  buildSettingsUrl: (ctx) => `/${ctx.locale}/practice/algebraic-notation`,
  buildAverageTimeText: () => undefined,
  showSignUpBanner: false,
  labelOverrides: () => ({
    averageTime: undefined,
  }),
  extraCompleteProps: (ctx, { adBanner }) => ({
    beforeRelatedContent: adBanner,
    relatedModule: {
      href: '/learn/notation/algebraic-notation',
      icon: '🔤',
      title: ctx.t('viewArticle'),
      description: ctx.t('articleDescription'),
    },
  }),
});
