'use client';

import { createPracticeResultClient } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultClient';

import { parseFenResultData } from './fen-result-data';

export const ResultClient = createPracticeResultClient({
  moduleSlug: 'fen',
  i18nKey: 'fen',
  titleKey: 'pageTitle',
  resolveScoreTotal: (sp) => {
    const data = parseFenResultData(sp.get('data'));
    return { score: data?.score ?? 0, total: data?.total ?? 0 };
  },
  buildTryAgainUrl: (ctx) => `/${ctx.locale}/practice/fen`,
  buildSettingsUrl: (ctx) => `/${ctx.locale}/practice/fen`,
  buildAverageTimeText: () => undefined,
  showSignUpBanner: false,
  buildScoreStats: (ctx) => {
    const data = parseFenResultData(ctx.searchParams.get('data'));
    return (
      data?.detailedStats ?? {
        correct: ctx.score,
        incorrect: ctx.total - ctx.score,
        total: ctx.total,
      }
    );
  },
  labelOverrides: (ctx) => ({
    score: ctx.searchParams.get('scoreText') || ctx.tPractice('score'),
    morePractice: ctx.tPractice('morePractice'),
    recreationProgress: ctx.t('recreationProgress'),
    correct: ctx.t('correct'),
    incorrect: ctx.t('incorrect'),
    missing: ctx.t('missing'),
    extra: ctx.t('extra'),
    extraDescription: ctx.t('extraDescription'),
    problemDetails: ctx.t('problemDetails'),
    problem: ctx.t('problem'),
    original: ctx.t('original'),
    yourRecreation: ctx.t('yourRecreation'),
    skipped: ctx.t('skipped'),
    averageTime: undefined,
  }),
  extraCompleteProps: (ctx, { adBanner }) => {
    const results = parseFenResultData(ctx.searchParams.get('data'))?.results ?? [];
    return {
      problemResults: results,
      beforeRelatedContent: adBanner,
      relatedModule: {
        href: '/learn/notation/fen-notation',
        icon: '📝',
        title: ctx.t('viewArticle'),
        description: ctx.t('articleDescription'),
      },
    };
  },
});
