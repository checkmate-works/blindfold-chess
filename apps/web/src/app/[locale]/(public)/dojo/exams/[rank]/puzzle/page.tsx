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
 * 2. The page opens laid out like a stored puzzle's detail page
 *    (`practice/puzzle/[id]`): what the rank's problem practises as its
 *    description, the piece list, the collapsible board, the patterns useful
 *    for solving (constants of the exam, not rows in `chunks`) and a start
 *    button.
 * 3. Solve move by move, the opponent's replies auto-played, as in a stored
 *    puzzle.
 * 4. On the solving move the player's moves go to `submitExamAnswer`. Signed
 *    out, the browser grades them as practice. The verdict offers a retry
 *    and the way back.
 * 5. A pass that completes the exam stashes the granted rank and returns to
 *    the problem list, which celebrates it.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';
import { EXAM_RANKS, examProblemOf, examRankOf } from '@blindfold-chess/features/dojo-journey';
import { previousRankSlug } from '@blindfold-chess/features/dojo-ranks';

import { PositionPeekBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionPeekBoard';
import { PiecesInfo } from '@/app/[locale]/(public)/practice/_components/PiecesInfo';
import { SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb, type BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ExamPatterns } from '../../_components/ExamPatterns';
import { ExamPuzzleSession } from '../../_components/ExamPuzzleSession';

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
  const exam = examRankOf(rank);
  if (!exam) return {};
  const t = await getTranslations({ locale });
  // ranks.rankNames.<EarnedRankSlug>: only ranks with an exam (examRankOf)
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
  const exam = examRankOf(rank);
  const problem = examProblemOf(exam, 'puzzle');
  if (!exam || !problem) notFound();

  const t = await getTranslations({ locale });
  // ranks.rankNames.<RankSlug>: the exam's rank and the one below it
  const rankName = t(`ranks.rankNames.${exam}`);
  const prevRankName = t(`ranks.rankNames.${previousRankSlug(exam)}`);
  const examTitle = t('dojoExam.title', { rankName });
  const problemName = t('ranks.examProblemNames.puzzle');

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: t('dojo.pageTitle'), href: '/dojo' },
    { label: examTitle, href: `/dojo/exams/${exam}` },
    { label: problemName },
  ];
  const breadcrumb = <Breadcrumb items={breadcrumbItems} locale={locale} density="compact" />;

  return (
    <ExamPuzzleSession
      rank={exam}
      problem={problem}
      title={problemName}
      piecesInfo={<PiecesInfo fen={problem.fen} />}
      breadcrumb={breadcrumb}
      breadcrumbItems={breadcrumbItems}
      locale={locale}
      prevRankName={prevRankName}
      intro={
        <>
          <SectionTitle>{t('practice.puzzle.detail.descriptionSection')}</SectionTitle>
          {/* dojoExam.puzzleIntro.<EarnedRankSlug>: each rank with this
              problem (generateStaticParams), which says what it practises. */}
          <p className="text-foreground">{t(`dojoExam.puzzleIntro.${exam}`, { rankName })}</p>
          <PiecesInfo fen={problem.fen} />
          <PositionPeekBoard fen={problem.fen} />
          <ExamPatterns
            patterns={problem.patterns}
            locale={locale}
            detailNamespace="practice.puzzle.detail"
          />
        </>
      }
    />
  );
}
