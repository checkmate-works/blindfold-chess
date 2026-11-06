/**
 * Admin Position Memory Problems (管理画面 ポジションの記憶問題管理, `/admin/positions/memory`)
 *
 * @description
 * Paginated table of position-memory problems.
 */
import { PositionsListPage } from '../_components/PositionsListPage';
import { DeletePositionButton } from './_components/DeletePositionButton';

export default async function AdminPositionMemoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <PositionsListPage
      type="memory"
      title="Position Memory"
      publicPathPrefix="/en/practice/position-memory"
      DeleteButton={DeletePositionButton}
      searchParams={searchParams}
    />
  );
}
