/**
 * Dojo Exam (道場の課題, `/dojo/exams/[rank]`)
 *
 * @description
 * Lists the problems of a rank's exam — for 2kyu, a position to recreate
 * from memory and a mate in two — each with its condition and a link to the
 * page that runs it. Passing every problem on record promotes the player to
 * the rank; this page is also where the promotion is celebrated, because the
 * problem pages send a freshly promoted player back here.
 *
 * The page is prerendered once per locale and rank and kept out of search
 * results. Everything about the viewer (which problems they have passed,
 * whether a pass would be recorded) is read after hydration by
 * `ExamProblemList`.
 *
 * @flow
 * 1. Unknown rank, or a rank without an exam → 404.
 * 2. Show the lead and one row per problem; the viewer's passed problems get
 *    a "solved" mark, and a note explains when a pass would not be recorded
 *    (signed out, or not yet holding the rank below).
 * 3. A problem page that completes the exam stashes the granted rank and
 *    returns here, where `RankAchievementModal` opens on mount.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';
import {
  DOJO_EXAMS,
  EXAM_RANKS,
  examProblemKinds,
  examProblemRule,
  examProblemSegment,
  examRankOf,
} from '@blindfold-chess/features/dojo-journey';

import { RankAchievementModal } from '@/app/[locale]/(public)/practice/_components/RankAchievementModal';
import { PageLayout } from '@/app/[locale]/_components';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ExamProblemList } from '../_components/ExamProblemList';
import type { ExamProblemRow } from '../_components/ExamProblemList';
import { previousRank } from '../_lib/exam-rank';

type Props = {
  params: Promise<{ locale: Locale; rank: string }>;
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.flatMap((locale) => EXAM_RANKS.map((rank) => ({ locale, rank })));
}

/** Every rank with an exam is prerendered; any other segment is a 404. */
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, rank } = await params;
  const exam = examRankOf(rank);
  if (!exam) return {};
  const t = await getTranslations({ locale });
  // ranks.rankNames.<EarnedRankSlug>: only ranks with an exam (examRankOf)
  const rankName = t(`ranks.rankNames.${exam}`);
  return {
    title: resolveTitle(t('dojoExam.title', { rankName }), locale),
    description: t('dojoExam.lead', { count: examProblemKinds(exam).length, rankName }),
    robots: { index: false, follow: false },
  };
}

export default async function DojoExamPage({ params }: Props) {
  const { locale, rank } = await params;
  setRequestLocale(locale);
  const exam = examRankOf(rank);
  if (!exam) notFound();

  const t = await getTranslations({ locale });
  // ranks.rankNames.<RankSlug>: the exam's rank and the one below it
  const rankName = t(`ranks.rankNames.${exam}`);
  const prevRankName = t(`ranks.rankNames.${previousRank(exam)}`);
  const title = t('dojoExam.title', { rankName });

  const rows: ExamProblemRow[] = examProblemKinds(exam).map((kind) => {
    // dojoExam.memoryRule / .memoryRulePerfect / .puzzleRule
    const { key, values } = examProblemRule(DOJO_EXAMS[exam]![kind]);
    const rule = t(`dojoExam.${key}`, values);
    return {
      kind,
      // ranks.examProblemNames.<ExamProblemKind>: position_memory, puzzle
      name: t(`ranks.examProblemNames.${kind}`),
      rule,
      href: `/dojo/exams/${exam}/${examProblemSegment(kind)}`,
    };
  });

  return (
    <PageLayout
      title={title}
      locale={locale}
      breadcrumb={[
        { label: t('dojo.pageTitle'), href: '/dojo' },
        { label: t('ranks.pageTitle'), href: '/dojo/ranks' },
        { label: rankName, href: `/dojo/ranks/${exam}` },
        { label: title },
      ]}
    >
      <p className="text-foreground/80">{t('dojoExam.lead', { count: rows.length, rankName })}</p>
      <ExamProblemList rank={exam} rows={rows} prevRankName={prevRankName} />
      <RankAchievementModal locale={locale} />
    </PageLayout>
  );
}
