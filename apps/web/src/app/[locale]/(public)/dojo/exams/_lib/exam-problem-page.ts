import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';
import { EXAM_RANKS, examProblemOf, examRankOf } from '@blindfold-chess/features/dojo-journey';
import type { ExamProblem } from '@blindfold-chess/features/dojo-journey';
import { previousRankSlug } from '@blindfold-chess/features/dojo-ranks';
import type { EarnedRankSlug, ExamProblemKind } from '@blindfold-chess/features/dojo-ranks';

import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * What the pages of one exam problem (`/dojo/exams/[rank]/position-memory`,
 * `/dojo/exams/[rank]/puzzle`) share before they lay the problem out: which
 * ranks to prerender, the title, and resolving the `[rank]` segment to the
 * problem with the names and trail every such page shows. The problem comes
 * from the exam's constants, not from a `positions` row, so there is nothing
 * to fetch.
 */

export type ExamProblemPageParams = Promise<{ locale: Locale; rank: string }>;

/** Every locale × rank whose exam has a `kind` problem. */
export function examProblemStaticParams(kind: ExamProblemKind) {
  return SUPPORTED_LOCALES.flatMap((locale) =>
    EXAM_RANKS.filter((rank) => examProblemOf(rank, kind)).map((rank) => ({ locale, rank }))
  );
}

/** "<problem name> - <rank>'s exam", kept out of search results. */
export async function examProblemMetadata(
  params: ExamProblemPageParams,
  kind: ExamProblemKind
): Promise<Metadata> {
  const { locale, rank } = await params;
  const exam = examRankOf(rank);
  if (!exam) return {};
  const t = await getTranslations({ locale });
  // ranks.rankNames.<EarnedRankSlug>: only ranks with an exam (examRankOf)
  const rankName = t(`ranks.rankNames.${exam}`);
  return {
    // ranks.examProblemNames.<ExamProblemKind>: position_memory, puzzle
    title: resolveTitle(
      `${t(`ranks.examProblemNames.${kind}`)} - ${t('dojoExam.title', { rankName })}`,
      locale
    ),
    robots: { index: false, follow: false },
  };
}

export type ExamProblemPage<K extends ExamProblemKind> = {
  locale: Locale;
  exam: EarnedRankSlug;
  problem: Extract<ExamProblem, { kind: K }>;
  t: Awaited<ReturnType<typeof getTranslations>>;
  rankName: string;
  /** Name of the rank a player has to hold before a pass is recorded. */
  prevRankName: string;
  problemName: string;
  /** Dojo → the rank's exam → this problem. */
  breadcrumbItems: BreadcrumbItem[];
};

/**
 * Seeds the request locale and resolves the page's `kind` problem, or 404s
 * for a rank without one.
 */
export async function loadExamProblemPage<K extends ExamProblemKind>(
  params: ExamProblemPageParams,
  kind: K
): Promise<ExamProblemPage<K>> {
  const { locale, rank } = await params;
  setRequestLocale(locale);
  const exam = examRankOf(rank);
  const problem = examProblemOf(exam, kind);
  if (!exam || !problem) notFound();

  const t = await getTranslations({ locale });
  // ranks.rankNames.<RankSlug>: the exam's rank and the one below it
  const rankName = t(`ranks.rankNames.${exam}`);
  const prevRankName = t(`ranks.rankNames.${previousRankSlug(exam)}`);
  // The generic `K` would make the key's type unresolvable to next-intl.
  const problemKind: ExamProblemKind = kind;
  // ranks.examProblemNames.<ExamProblemKind>: position_memory, puzzle
  const problemName = t(`ranks.examProblemNames.${problemKind}`);
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: t('dojo.pageTitle'), href: '/dojo' },
    { label: t('dojoExam.title', { rankName }), href: `/dojo/exams/${exam}` },
    { label: problemName },
  ];
  return { locale, exam, problem, t, rankName, prevRankName, problemName, breadcrumbItems };
}
