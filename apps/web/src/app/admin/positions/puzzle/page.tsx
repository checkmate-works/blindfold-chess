import { listFeaturedPuzzleIds } from '@/lib/positions/queries';

import { PositionsListPage } from '../_components/PositionsListPage';
import { DeletePuzzleButton } from './_components/DeletePuzzleButton';
import { FeaturePuzzleToggle } from './_components/FeaturePuzzleToggle';

export default async function AdminPositionPuzzlePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const featuredIds = await listFeaturedPuzzleIds();

  return (
    <PositionsListPage
      type="puzzle"
      title="Puzzle"
      publicPathPrefix="/en/practice/puzzle"
      DeleteButton={DeletePuzzleButton}
      renderRowAction={(position) => (
        <FeaturePuzzleToggle id={position.id} featured={featuredIds.has(position.id)} />
      )}
      searchParams={searchParams}
    />
  );
}
