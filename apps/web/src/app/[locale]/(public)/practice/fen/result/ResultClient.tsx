'use client';

import { createPracticeResultClient } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultClient';

export const ResultClient = createPracticeResultClient({
  moduleSlug: 'fen',
  i18nKey: 'fen',
  titleKey: 'pageTitle',
  resolveScoreTotal: (sp) => {
    const dataParam = sp.get('data');
    if (!dataParam) return { score: 0, total: 0 };
    try {
      const parsed = JSON.parse(decodeURIComponent(dataParam));
      return { score: parsed.score ?? 0, total: parsed.total ?? 0 };
    } catch {
      return { score: 0, total: 0 };
    }
  },
  buildTryAgainUrl: (ctx) => `/${ctx.locale}/practice/fen`,
  buildSettingsUrl: (ctx) => `/${ctx.locale}/practice/fen`,
  buildAverageTimeText: () => undefined,
  showSignUpBanner: false,
  buildScoreStats: (ctx) => {
    const dataParam = ctx.searchParams.get('data');
    if (!dataParam) return { correct: 0, incorrect: 0, total: 0 };
    try {
      const parsed = JSON.parse(decodeURIComponent(dataParam));
      return (
        parsed.detailedStats ?? {
          correct: ctx.score,
          incorrect: ctx.total - ctx.score,
          total: ctx.total,
        }
      );
    } catch {
      return { correct: ctx.score, incorrect: ctx.total - ctx.score, total: ctx.total };
    }
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
    const dataParam = ctx.searchParams.get('data');
    let results: unknown[] = [];
    if (dataParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dataParam));
        results = parsed.results ?? [];
      } catch {
        // ignore
      }
    }
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
