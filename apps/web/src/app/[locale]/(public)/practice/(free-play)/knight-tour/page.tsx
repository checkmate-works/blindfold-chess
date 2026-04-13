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
import { createPracticeTopPage } from '@/app/[locale]/(public)/practice/_lib/createPracticeTopPage';

import { KnightTourPageContent } from './_components/KnightTourPageContent';

const { generateMetadata, Page } = createPracticeTopPage({
  i18nKey: 'knightTour',
  canonicalPath: 'practice/knight-tour',
  renderSetup: (locale) => <KnightTourPageContent locale={locale} />,
  renderArticles: () => null,
});

export { generateMetadata };
export default Page;
