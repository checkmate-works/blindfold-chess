import type { ReactNode } from 'react';

import type { RankSlug } from '@/lib/db/data/ranks';

import { AllAnchorPointsBoard } from '@/app/[locale]/(public)/ranks/_components/AllAnchorPointsBoard';
import { AnchorPointsBoard } from '@/app/[locale]/(public)/ranks/_components/AnchorPointsBoard';
import { BishopFormulaBlock } from '@/app/[locale]/(public)/ranks/_components/BishopFormulaBlock';
import { BishopMovementBoard } from '@/app/[locale]/(public)/ranks/_components/BishopMovementBoard';
import { CoordinateBoard } from '@/app/[locale]/(public)/ranks/_components/CoordinateBoard';
import { HighlightQuadrantBoard } from '@/app/[locale]/(public)/ranks/_components/HighlightQuadrantBoard';
import { KingFormulaBlock } from '@/app/[locale]/(public)/ranks/_components/KingFormulaBlock';
import { KingMovementBoard } from '@/app/[locale]/(public)/ranks/_components/KingMovementBoard';
import { KnightFormulaBlock } from '@/app/[locale]/(public)/ranks/_components/KnightFormulaBlock';
import { KnightMovementBoard } from '@/app/[locale]/(public)/ranks/_components/KnightMovementBoard';
import { MiniBoard } from '@/app/[locale]/(public)/ranks/_components/MiniBoard';
import { QuadrantBoard } from '@/app/[locale]/(public)/ranks/_components/QuadrantBoard';
import { QueenMovementBoard } from '@/app/[locale]/(public)/ranks/_components/QueenMovementBoard';
import { RookMovementBoard } from '@/app/[locale]/(public)/ranks/_components/RookMovementBoard';
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
};

export function getVisualAid(
  rankSlug: RankSlug,
  pageNumber: number,
  paragraphIndex: number
): ReactNode | null {
  const key: VisualAidKey = `${rankSlug}:${pageNumber}:${paragraphIndex}`;
  return VISUAL_AID_MAP[key] ?? null;
}
