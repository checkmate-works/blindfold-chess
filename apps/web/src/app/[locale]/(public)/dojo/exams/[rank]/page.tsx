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
import { DOJO_EXAMS } from '@blindfold-chess/features/dojo-journey';
import { parseSolutionLines } from '@blindfold-chess/features/puzzle';

import { examProblemSegment } from '@/app/[locale]/(public)/dojo/ranks/_lib/requirement-items';
import { RankAchievementModal } from '@/app/[locale]/(public)/practice/_components/RankAchievementModal';
import { PageLayout } from '@/app/[locale]/_components';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ExamProblemList } from '../_components/ExamProblemList';
import type { ExamProblemRow } from '../_components/ExamProblemList';
import { EXAM_RANKS, examProblemKinds, parseExamRank, previousRank } from '../_lib/exam-rank';

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
  const exam = parseExamRank(rank);
  if (!exam) return {};
  const t = await getTranslations({ locale });
  // ranks.rankNames.<EarnedRankSlug>: only ranks with an exam (parseExamRank)
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
  const exam = parseExamRank(rank);
  if (!exam) notFound();

  const t = await getTranslations({ locale });
  // ranks.rankNames.<RankSlug>: the exam's rank and the one below it
  const rankName = t(`ranks.rankNames.${exam}`);
  const prevRankName = t(`ranks.rankNames.${previousRank(exam)}`);
  const title = t('dojoExam.title', { rankName });

  const rows: ExamProblemRow[] = examProblemKinds(exam).map((kind) => {
    const problem = DOJO_EXAMS[exam]![kind];
    const rule =
      problem.kind === 'position_memory'
        ? // "100% or better" reads oddly, so a perfect-recreation mark has its own wording.
          problem.minAccuracy === 100
          ? t('dojoExam.memoryRulePerfect', { seconds: problem.memorizeSeconds })
          : t('dojoExam.memoryRule', {
              seconds: problem.memorizeSeconds,
              accuracy: problem.minAccuracy,
            })
        : t('dojoExam.puzzleRule', {
            // The player's moves only — the length of the mate.
            moves: parseSolutionLines(problem.solutions)[0]?.playerSlots.length ?? 0,
          });
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
