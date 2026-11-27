/**
 * Dojo Exam: Position Memory (道場の課題 ポジション記憶, `/dojo/exams/[rank]/position-memory`)
 *
 * @description
 * Runs the position-memory problem of a rank's exam: the position is shown
 * for the problem's memorize seconds, then recreated on an empty board. The
 * recreation is graded on the server against the problem's accuracy mark,
 * and the verdict is shown on this page. Prerendered and kept out of search
 * results; nothing about the viewer is rendered on the server.
 *
 * @flow
 * 1. Unknown rank, or a rank without this problem → 404.
 * 2. The page opens on the problem's condition and a start button, laid out
 *    like a free-play problem's detail page (`practice/position-memory/
 *    custom/[token]`) minus its board and piece list: either would let the
 *    player study the position past the memorize seconds.
 * 3. Memorize → recreate, as in the single-position practice session (no
 *    pause: the seconds are part of the problem).
 * 4. The recreated FEN goes to `submitExamAnswer`. Signed out, the browser
 *    grades it as practice. The verdict offers a retry and the way back.
 * 5. A pass that completes the exam stashes the granted rank and returns to
 *    the problem list, which celebrates it.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';

import { PositionDetailLayout } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionDetailLayout';
import { SectionTitle } from '@/app/[locale]/_components';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ExamMemorySession } from '../../_components/ExamMemorySession';
import { EXAM_RANKS, examProblemOf, parseExamRank, previousRank } from '../../_lib/exam-rank';

type Props = {
  params: Promise<{ locale: Locale; rank: string }>;
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.flatMap((locale) =>
    EXAM_RANKS.filter((rank) => examProblemOf(rank, 'position_memory')).map((rank) => ({
      locale,
      rank,
    }))
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
      `${t('ranks.examProblemNames.position_memory')} - ${t('dojoExam.title', { rankName })}`,
      locale
    ),
    robots: { index: false, follow: false },
  };
}

export default async function DojoExamPositionMemoryPage({ params }: Props) {
  const { locale, rank } = await params;
  setRequestLocale(locale);
  const exam = parseExamRank(rank);
  const problem = exam ? examProblemOf(exam, 'position_memory') : undefined;
  if (!exam || !problem) notFound();

  const t = await getTranslations({ locale });
  // ranks.rankNames.<RankSlug>: the exam's rank and the one below it
  const rankName = t(`ranks.rankNames.${exam}`);
  const prevRankName = t(`ranks.rankNames.${previousRank(exam)}`);
  const examTitle = t('dojoExam.title', { rankName });
  const problemName = t('ranks.examProblemNames.position_memory');
  const rule = t('dojoExam.memoryRule', {
    seconds: problem.memorizeSeconds,
    accuracy: problem.minAccuracy,
  });

  return (
    <PositionDetailLayout
      title={problemName}
      locale={locale}
      breadcrumbItems={[
        { label: t('dojo.pageTitle'), href: '/dojo' },
        { label: examTitle, href: `/dojo/exams/${exam}` },
        { label: problemName },
      ]}
    >
      <ExamMemorySession
        rank={exam}
        problem={problem}
        prevRankName={prevRankName}
        intro={
          <>
            <SectionTitle>{t('practice.positionMemory.detail.descriptionSection')}</SectionTitle>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-foreground">{rule}</p>
            </div>
          </>
        }
      />
    </PositionDetailLayout>
  );
}
