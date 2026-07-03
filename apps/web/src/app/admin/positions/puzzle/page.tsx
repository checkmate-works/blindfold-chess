import { PositionsListPage } from '../_components/PositionsListPage';
import { DeletePuzzleButton } from './_components/DeletePuzzleButton';

export default async function AdminPositionPuzzlePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <PositionsListPage
      type="puzzle"
      title="Puzzle"
      publicPathPrefix="/en/practice/puzzle"
      DeleteButton={DeletePuzzleButton}
      searchParams={searchParams}
    />
  );
}
