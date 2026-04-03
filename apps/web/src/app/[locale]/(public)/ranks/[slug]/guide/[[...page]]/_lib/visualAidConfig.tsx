import type { ReactNode } from 'react';

import type { RankSlug } from '@/lib/db/data/ranks';

import { AllAnchorPointsBoard } from '@/app/[locale]/(public)/ranks/_components/AllAnchorPointsBoard';
import { AnchorPointsBoard } from '@/app/[locale]/(public)/ranks/_components/AnchorPointsBoard';
import { CoordinateBoard } from '@/app/[locale]/(public)/ranks/_components/CoordinateBoard';
import { HighlightQuadrantBoard } from '@/app/[locale]/(public)/ranks/_components/HighlightQuadrantBoard';
import { MiniBoard } from '@/app/[locale]/(public)/ranks/_components/MiniBoard';
import { QuadrantBoard } from '@/app/[locale]/(public)/ranks/_components/QuadrantBoard';
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
};

export function getVisualAid(
  rankSlug: RankSlug,
  pageNumber: number,
  paragraphIndex: number
): ReactNode | null {
  const key: VisualAidKey = `${rankSlug}:${pageNumber}:${paragraphIndex}`;
  return VISUAL_AID_MAP[key] ?? null;
}
