/**
 * Paragraph-level visual aid registry for rank guide pages.
 *
 * Keyed on `(rankSlug, pageNumber, paragraphIndex)` — the same coordinate
 * space used by {@link getGuideInlineLink} in `./paragraphInlineLinks.ts`.
 * The two files are deliberately kept separate (one owns link cards, the
 * other owns board/visual components) but the parallel naming signals that
 * they are both indexed by the same identifier tuple.
 *
 * Adding a new visual aid: pick the `(rank, page, paragraph)` coordinates,
 * add an entry to `VISUAL_AID_MAP`, and import the board component from
 * `@/app/[locale]/(public)/ranks/_components/`. Board components must be
 * client components so they can read `useGamePreferences` for theme.
 */
import type { ReactNode } from 'react';

import type { RankSlug } from '@/lib/db/data/ranks';

import { AllAnchorPointsBoard } from '@/app/[locale]/(public)/ranks/_components/AllAnchorPointsBoard';
import { AnchorPointsBoard } from '@/app/[locale]/(public)/ranks/_components/AnchorPointsBoard';
import { AntiDiagAFileArrowsBoard } from '@/app/[locale]/(public)/ranks/_components/AntiDiagAFileArrowsBoard';
import { AntiDiagEndHFileBoard } from '@/app/[locale]/(public)/ranks/_components/AntiDiagEndHFileBoard';
import { AntiDiagEndRank1Board } from '@/app/[locale]/(public)/ranks/_components/AntiDiagEndRank1Board';
import { AntiDiagRank8ArrowsBoard } from '@/app/[locale]/(public)/ranks/_components/AntiDiagRank8ArrowsBoard';
import { AntiDiagStartAFileBoard } from '@/app/[locale]/(public)/ranks/_components/AntiDiagStartAFileBoard';
import { AntiDiagStartRank8Board } from '@/app/[locale]/(public)/ranks/_components/AntiDiagStartRank8Board';
import { AntiDiagonalBoard } from '@/app/[locale]/(public)/ranks/_components/AntiDiagonalBoard';
import { BishopFormulaBlock } from '@/app/[locale]/(public)/ranks/_components/BishopFormulaBlock';
import { BishopMovementBoard } from '@/app/[locale]/(public)/ranks/_components/BishopMovementBoard';
import { CoordinateBoard } from '@/app/[locale]/(public)/ranks/_components/CoordinateBoard';
import { DiagonalAFileArrowsBoard } from '@/app/[locale]/(public)/ranks/_components/DiagonalAFileArrowsBoard';
import { DiagonalBoard } from '@/app/[locale]/(public)/ranks/_components/DiagonalBoard';
import { DiagonalEndHFileBoard } from '@/app/[locale]/(public)/ranks/_components/DiagonalEndHFileBoard';
import { DiagonalEndRank8Board } from '@/app/[locale]/(public)/ranks/_components/DiagonalEndRank8Board';
import {
  AntiDiagAFileTable,
  AntiDiagRank8Table,
  DiagonalAFileTable,
  DiagonalRank1Table,
} from '@/app/[locale]/(public)/ranks/_components/DiagonalPatternTables';
import { DiagonalRank1ArrowsBoard } from '@/app/[locale]/(public)/ranks/_components/DiagonalRank1ArrowsBoard';
import { DiagonalStartAFileBoard } from '@/app/[locale]/(public)/ranks/_components/DiagonalStartAFileBoard';
import { DiagonalStartRank1Board } from '@/app/[locale]/(public)/ranks/_components/DiagonalStartRank1Board';
import { HighlightQuadrantBoard } from '@/app/[locale]/(public)/ranks/_components/HighlightQuadrantBoard';
import { KingFormulaBlock } from '@/app/[locale]/(public)/ranks/_components/KingFormulaBlock';
import { KingMovementBoard } from '@/app/[locale]/(public)/ranks/_components/KingMovementBoard';
import { KingsideCastledBoard } from '@/app/[locale]/(public)/ranks/_components/KingsideCastledBoard';
import { KnightFormulaBlock } from '@/app/[locale]/(public)/ranks/_components/KnightFormulaBlock';
import { KnightMovementBoard } from '@/app/[locale]/(public)/ranks/_components/KnightMovementBoard';
import { MiniBoard } from '@/app/[locale]/(public)/ranks/_components/MiniBoard';
import { PawnBreakthroughBoard } from '@/app/[locale]/(public)/ranks/_components/PawnBreakthroughBoard';
import { PawnBreakthroughLine } from '@/app/[locale]/(public)/ranks/_components/PawnBreakthroughLine';
import { QuadrantBoard } from '@/app/[locale]/(public)/ranks/_components/QuadrantBoard';
import { QueenMovementBoard } from '@/app/[locale]/(public)/ranks/_components/QueenMovementBoard';
import { RookMovementBoard } from '@/app/[locale]/(public)/ranks/_components/RookMovementBoard';
import { ScatteredPawnsBoard } from '@/app/[locale]/(public)/ranks/_components/ScatteredPawnsBoard';
import { Step3Board } from '@/app/[locale]/(public)/ranks/_components/Step3Board';
import { SymmetryBoard } from '@/app/[locale]/(public)/ranks/_components/SymmetryBoard';

type VisualAidKey = `${RankSlug}:${number}:${number}`;

/**
 * Maps (rankSlug, pageNumber, paragraphIndex) to the visual aid component
 * rendered after that paragraph.
 */
const VISUAL_AID_MAP: Record<VisualAidKey, ReactNode> = {
  // Mukyu guide: coordinate board after the coordinate explanation paragraph
  'mukyu:1:2': <CoordinateBoard />,
  // Mukyu guide page 3: quadrant board after the quadrant training paragraph
  'mukyu:3:0': <QuadrantBoard />,
  // 5kyu guide
  '5kyu:1:1': <AnchorPointsBoard />,
  '5kyu:1:3': <QuadrantBoard />,
  '5kyu:1:4': <MiniBoard />,
  '5kyu:1:6': <SymmetryBoard />,
  '5kyu:2:0': <AllAnchorPointsBoard />,
  '5kyu:2:5': <HighlightQuadrantBoard quadrant="top-right" />,
  '5kyu:2:6': <MiniBoard quadrant="top-right" highlightedSquares={['e5']} />,
  '5kyu:2:7': <Step3Board />,
  // 3kyu guide - page 1
  '3kyu:1:2': <DiagonalBoard />,
  '3kyu:1:8': <DiagonalStartAFileBoard />,
  // 3kyu guide - page 2
  '3kyu:2:2': <DiagonalStartRank1Board />,
  '3kyu:2:4': <DiagonalBoard />,
  // 3kyu guide - page 3
  '3kyu:3:5': <DiagonalEndRank8Board />,
  '3kyu:3:7': <DiagonalEndHFileBoard />,
  // 3kyu guide - page 4 (anti-diagonal starting points)
  '3kyu:4:0': <AntiDiagonalBoard />,
  '3kyu:4:5': <AntiDiagStartAFileBoard />,
  '3kyu:4:7': <AntiDiagStartRank8Board />,
  // 3kyu guide - page 5 (anti-diagonal endpoints)
  '3kyu:5:3': <AntiDiagEndRank1Board />,
  '3kyu:5:5': <AntiDiagEndHFileBoard />,
  // 3kyu guide - page 6 (diagonal pattern tables)
  '3kyu:6:1': <DiagonalAFileTable />,
  '3kyu:6:2': <DiagonalAFileArrowsBoard />,
  '3kyu:6:3': <DiagonalRank1Table />,
  '3kyu:6:4': <DiagonalRank1ArrowsBoard />,
  // 3kyu guide - page 7 (anti-diagonal pattern tables)
  '3kyu:7:0': <AntiDiagAFileTable />,
  '3kyu:7:1': <AntiDiagAFileArrowsBoard />,
  '3kyu:7:2': <AntiDiagRank8Table />,
  '3kyu:7:3': <AntiDiagRank8ArrowsBoard />,
  // 4kyu guide - King (page 1)
  '4kyu:1:2': <KingMovementBoard />,
  '4kyu:1:6': <KingFormulaBlock />,
  // 4kyu guide - Knight (page 2)
  '4kyu:2:0': <KnightMovementBoard />,
  '4kyu:2:2': <KnightFormulaBlock />,
  // 4kyu guide - Bishop (page 3)
  '4kyu:3:0': <BishopMovementBoard />,
  '4kyu:3:1': <BishopFormulaBlock />,
  // 4kyu guide - Rook & Queen (page 4)
  '4kyu:4:0': <RookMovementBoard />,
  '4kyu:4:1': <QueenMovementBoard />,
  // 2kyu guide - 10-piece position-memory experiments (chunks)
  // page 1: the hard, structureless position; page 2: the chunked (both-castled)
  // counterpart. Both link to an instant "custom" problem of the same FEN.
  '2kyu:1:3': <ScatteredPawnsBoard />,
  '2kyu:2:3': <KingsideCastledBoard />,
  // 1kyu guide - page 2 (endgame patterns worth memorising): the pawn
  // breakthrough position, followed by its forced winning line as a
  // click-to-replay move reference.
  '1kyu:2:0': <PawnBreakthroughBoard />,
  '1kyu:2:1': <PawnBreakthroughLine />,
};

export function getVisualAid(
  rankSlug: RankSlug,
  pageNumber: number,
  paragraphIndex: number
): ReactNode | null {
  const key: VisualAidKey = `${rankSlug}:${pageNumber}:${paragraphIndex}`;
  return VISUAL_AID_MAP[key] ?? null;
}
