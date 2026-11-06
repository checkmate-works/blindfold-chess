/**
 * Edit Puzzle (パズルを編集, `/practice/puzzle/[id]/edit`)
 *
 * @description
 * Owner-only first step of puzzle editing: the position, title, description and tags form.
 */
import {
  PUZZLE_ROUTE,
  createPositionEditPage,
} from '@/app/[locale]/(public)/practice/(free-play)/_lib/create-position-route-pages';

import { EditPuzzlePositionForm } from '../../_components/EditPuzzlePositionForm';
import { loadPuzzleWithSolutions } from '../../_lib/load-puzzle';

const { generateMetadata, Page } = createPositionEditPage(PUZZLE_ROUTE, {
  loadEditData: loadPuzzleWithSolutions,
  renderForm: ({ data, attachedTags, availableTags }) => {
    const { position, solutions } = data;
    const solutionMoves =
      solutions[0]?.solutionMoves.map((m) => ({ san: m.san, note: m.note ?? null })) ?? [];

    return (
      <EditPuzzlePositionForm
        positionId={position.id}
        initial={{
          title: position.title,
          description: position.description,
          fen: position.fen,
          solutionMoves,
          themes: attachedTags.themes,
          chunks: attachedTags.chunks,
        }}
        available={{ themes: availableTags.themes, chunks: availableTags.chunks }}
      />
    );
  },
});

export { generateMetadata };
export default Page;
