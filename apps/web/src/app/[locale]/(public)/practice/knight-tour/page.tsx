/**
 * Knight Tour (ナイトツアー)
 *
 * @description
 * A blindfold chess training mode where users attempt to visit all 64 squares
 * of the chessboard using only knight moves, without revisiting any square.
 * This practice develops spatial reasoning and knight movement visualization,
 * which are essential skills for blindfold chess.
 *
 * @flow
 * 1. Setup Phase: Configure starting square (random or specific) and blindfold mode
 * 2. Playing Phase: Move the knight using L-shaped moves to visit all 64 squares
 *    - Each square can only be visited once
 *    - Undo is available to backtrack from dead ends
 * 3. Result Phase: Display success/failure, move count, and closed tour status
 *
 * @concepts
 * - Starting Square: The initial position of the knight
 * - Knight Move: L-shaped movement (2 squares + 1 square perpendicular)
 * - Visited Squares: Squares already visited (cannot be revisited)
 * - Available Moves: Unvisited squares reachable from current position
 * - Tour Complete: All 64 squares have been visited
 * - Closed Tour: A complete tour where the final square can return to the starting square via knight move
 * - Blindfold Mode: Play without seeing the board visualization
 * - Warnsdorff's Rule: Heuristic that prioritizes squares with fewer unvisited neighbors
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Divider, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { KnightTourPageContent } from './_components/KnightTourPageContent';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/knight-tour' }),
    title: t('practice.knightTour.title'),
    description: t('practice.knightTour.description'),
  };
}

export default async function KnightTourPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.knightTour.title')}</PageTitle>

      <KnightTourPageContent locale={locale} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.knightTour.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
