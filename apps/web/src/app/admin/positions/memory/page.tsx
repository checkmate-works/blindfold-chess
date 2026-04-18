import Link from 'next/link';

import { AdminDataTable } from '@/app/admin/_components/AdminDataTable';
import { AdminPaginationNav } from '@/app/admin/_components/AdminPaginationNav';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';
import { countPositions, listPositions } from '@/lib/positions/queries';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';
import { truncate } from '@/lib/text';

import { DeletePositionButton } from './_components/DeletePositionButton';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

export default async function AdminPositionMemoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page } = await searchParamsCache.parse(searchParams);

  const totalCount = await countPositions({ type: 'memory' });

  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    DEFAULT_PAGE_SIZE
  );

  const rows = await listPositions({ type: 'memory', limit, offset });

  const buildHref = (p: number) => `/admin/positions/memory?page=${p}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Position Memory</h1>
      </div>

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
                href={`/en/practice/position-memory/${position.id}`}
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
              <DeletePositionButton id={position.id} title={position.title} />
            </td>
          </tr>
        )}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
