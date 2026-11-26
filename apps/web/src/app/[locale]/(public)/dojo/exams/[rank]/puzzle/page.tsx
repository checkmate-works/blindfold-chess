/**
 * Dojo Exam: Puzzle (道場の課題 パズル, `/dojo/exams/[rank]/puzzle`)
 *
 * @description
 * Runs the puzzle problem of a rank's exam in the ordinary puzzle session.
 * The player's moves are graded on the server once the line is complete,
 * and the verdict is shown on this page instead of the stored puzzles'
 * result page; there is no "show answer". Prerendered and kept out of search
 * results; nothing about the viewer is rendered on the server.
 *
 * @flow
 * 1. Unknown rank, or a rank without this problem → 404.
 * 2. Solve move by move, the opponent's replies auto-played, as in a stored
 *    puzzle.
 * 3. On the solving move the player's moves go to `submitExamAnswer`. Signed
 *    out, the browser grades them as practice. The verdict offers a retry
 *    and the way back.
 * 4. A pass that completes the exam stashes the granted rank and returns to
 *    the problem list, which celebrates it.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';

import { PiecesInfo } from '@/app/[locale]/(public)/practice/_components/PiecesInfo';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ExamPuzzleSession } from '../../_components/ExamPuzzleSession';
import { EXAM_RANKS, examProblemOf, parseExamRank, previousRank } from '../../_lib/exam-rank';

type Props = {
  params: Promise<{ locale: Locale; rank: string }>;
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.flatMap((locale) =>
    EXAM_RANKS.filter((rank) => examProblemOf(rank, 'puzzle')).map((rank) => ({ locale, rank }))
  );
}

/** Every rank with this problem is prerendered; any other segment is a 404. */
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, rank } = await params;
  const exam = parseExamRank(rank);
  if (!exam) return {};
  const t = await getTranslations({ locale });
  // ranks.rankNames.<EarnedRankSlug>: only ranks with an exam (parseExamRank)
  const rankName = t(`ranks.rankNames.${exam}`);
  return {
    title: resolveTitle(
      `${t('ranks.examProblemNames.puzzle')} - ${t('dojoExam.title', { rankName })}`,
      locale
    ),
    robots: { index: false, follow: false },
  };
}

export default async function DojoExamPuzzlePage({ params }: Props) {
  const { locale, rank } = await params;
  setRequestLocale(locale);
  const exam = parseExamRank(rank);
  const problem = exam ? examProblemOf(exam, 'puzzle') : undefined;
  if (!exam || !problem) notFound();

  const t = await getTranslations({ locale });
  // ranks.rankNames.<RankSlug>: the exam's rank and the one below it
  const rankName = t(`ranks.rankNames.${exam}`);
  const prevRankName = t(`ranks.rankNames.${previousRank(exam)}`);
  const examTitle = t('dojoExam.title', { rankName });
  const problemName = t('ranks.examProblemNames.puzzle');

  const breadcrumb = (
    <Breadcrumb
      items={[
        { label: t('dojo.pageTitle'), href: '/dojo' },
        { label: examTitle, href: `/dojo/exams/${exam}` },
        { label: problemName },
      ]}
      locale={locale}
      density="compact"
    />
  );

  return (
    <ExamPuzzleSession
      rank={exam}
      problem={problem}
      title={problemName}
      piecesInfo={<PiecesInfo fen={problem.fen} />}
      breadcrumb={breadcrumb}
      prevRankName={prevRankName}
    />
  );
}
