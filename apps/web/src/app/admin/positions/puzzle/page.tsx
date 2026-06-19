import Link from 'next/link';

import { AdminDataTable } from '@/app/admin/_components/AdminDataTable';
import { AdminPageHeader } from '@/app/admin/_components/AdminPageHeader';
import { AdminPaginationNav } from '@/app/admin/_components/AdminPaginationNav';
import { adminPageSearchParamsCache } from '@/app/admin/_lib/admin-search-params';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';
import { countPositions, listPositions } from '@/lib/positions/queries';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';
import { truncate } from '@/lib/text';

import { DeletePuzzleButton } from './_components/DeletePuzzleButton';

export default async function AdminPositionPuzzlePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page } = await adminPageSearchParamsCache.parse(searchParams);

  const totalCount = await countPositions({ type: 'puzzle' });

  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    DEFAULT_PAGE_SIZE
  );

  const rows = await listPositions({ type: 'puzzle', limit, offset });

  const buildHref = (p: number) => `/admin/positions/puzzle?page=${p}`;

  return (
    <div>
      <AdminPageHeader breadcrumbs={[{ label: 'Puzzle' }]} />

      {rows.length > 0 && (
        <p className="text-sm text-muted-foreground mb-2">
          Showing {(currentPage - 1) * DEFAULT_PAGE_SIZE + 1}&ndash;
          {(currentPage - 1) * DEFAULT_PAGE_SIZE + rows.length} of {totalCount} positions
        </p>
      )}

      <AdminDataTable
        headers={['Title', 'Board', 'Description', 'Created At', 'Actions']}
        items={rows}
        emptyMessage="No positions found"
        renderRow={(position) => (
          <tr key={position.id} className="border-t border-border">
            <td className="px-4 py-3">
              <Link
                href={`/en/practice/puzzle/${position.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <span className="font-medium">{position.title}</span>
                <FaExternalLinkAlt className="h-3 w-3" />
              </Link>
            </td>
            <td className="px-4 py-3">
              <BoardThumbnail fen={position.fen} className="w-20 h-20" />
            </td>
            <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
              {position.description ? truncate(position.description) : '-'}
            </td>
            <td className="px-4 py-3 text-muted-foreground text-sm">
              {new Date(position.createdAt).toLocaleString()}
            </td>
            <td className="px-4 py-3">
              <DeletePuzzleButton id={position.id} title={position.title} />
            </td>
          </tr>
        )}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
