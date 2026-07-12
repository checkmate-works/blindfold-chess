import {
  PUZZLE_ROUTE,
  createPositionEditPage,
} from '@/app/[locale]/(public)/practice/(free-play)/_lib/create-position-route-pages';

import { DeletePuzzleButton } from '../../_components/DeletePuzzleButton';
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
  renderDeleteButton: ({ positionId, locale }) => (
    <DeletePuzzleButton puzzleId={positionId} locale={locale} />
  ),
});

export { generateMetadata };
export default Page;
