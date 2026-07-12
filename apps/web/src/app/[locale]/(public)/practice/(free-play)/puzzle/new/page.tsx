import { executeMove } from '@blindfold-chess/features/chess-core';

import { loadPuzzleForkSeed } from '@/lib/positions/fork';

import {
  PUZZLE_ROUTE,
  createPositionCreatePage,
} from '@/app/[locale]/(public)/practice/(free-play)/_lib/create-position-route-pages';

import { CreatePuzzlePositionForm } from '../_components/CreatePuzzlePositionForm';

const { generateMetadata, Page } = createPositionCreatePage(PUZZLE_ROUTE, {
  listTitleKey: 'title',
  formSectionClassName: 'space-y-6',
  loadForkSeed: loadPuzzleForkSeed,
  // The board is seeded from `?fen=` (e.g. "create a puzzle from this game
  // position"). An optional `?solution=` SAN move (the game's continuation)
  // seeds the first solution move, but only when it is legal from the seeded
  // position — otherwise the position is seeded alone.
  renderForm: ({ user, displayName, availableTags, forkSeed, injectedFen, searchParams }) => {
    const solutionParam = searchParams.solution;
    const continuation =
      injectedFen && typeof solutionParam === 'string'
        ? executeMove(injectedFen, solutionParam)
        : null;
    const injectedSolution = continuation ? [continuation.moveResult.san] : undefined;

    return (
      <CreatePuzzlePositionForm
        displayName={displayName}
        disableUnsavedGuard={!user}
        availableThemes={availableTags.themes}
        availableChunks={availableTags.chunks}
        forkSeed={forkSeed}
        injectedFen={injectedFen}
        injectedSolution={injectedSolution}
      />
    );
  },
});

export { generateMetadata };
export default Page;
