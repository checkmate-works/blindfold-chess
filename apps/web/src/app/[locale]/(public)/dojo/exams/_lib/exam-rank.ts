import { DOJO_EXAMS } from '@blindfold-chess/features/dojo-journey';
import type { ExamProblem } from '@blindfold-chess/features/dojo-journey';
import { RANK_SLUGS } from '@blindfold-chess/features/dojo-ranks';
import type {
  EarnedRankSlug,
  ExamProblemKind,
  RankSlug,
} from '@blindfold-chess/features/dojo-ranks';

/** The ranks that have an exam, lowest first — the `[rank]` segments to prerender. */
export const EXAM_RANKS: readonly EarnedRankSlug[] = RANK_SLUGS.filter(
  (slug): slug is EarnedRankSlug => slug !== 'mukyu' && DOJO_EXAMS[slug] !== undefined
);

/** `value` as a rank that has an exam, or undefined. Safe on URL input. */
export function parseExamRank(value: string): EarnedRankSlug | undefined {
  return EXAM_RANKS.find((rank) => rank === value);
}

/** The problem kinds of `rank`'s exam, in the order the exam lists them. */
export function examProblemKinds(rank: EarnedRankSlug): ExamProblemKind[] {
  return Object.keys(DOJO_EXAMS[rank] ?? {}) as ExamProblemKind[];
}

/** One problem of `rank`'s exam, narrowed to the shape its kind implies. */
export function examProblemOf<K extends ExamProblemKind>(
  rank: EarnedRankSlug,
  kind: K
): Extract<ExamProblem, { kind: K }> | undefined {
  const problem = DOJO_EXAMS[rank]?.[kind];
  return problem?.kind === kind ? (problem as Extract<ExamProblem, { kind: K }>) : undefined;
}

/**
 * The rank right below `rank` — the one a player has to hold before a pass at
 * `rank` is recorded.
 */
export function previousRank(rank: EarnedRankSlug): RankSlug {
  return RANK_SLUGS[RANK_SLUGS.indexOf(rank) - 1] ?? 'mukyu';
}
