import Link from 'next/link';

import { AdminDataTable } from '@/app/admin/_components/AdminDataTable';
import { AdminListSummary } from '@/app/admin/_components/AdminListSummary';
import { AdminPageHeader } from '@/app/admin/_components/AdminPageHeader';
import { AdminPaginationNav } from '@/app/admin/_components/AdminPaginationNav';
import { adminPageSearchParamsCache } from '@/app/admin/_lib/admin-search-params';
import { formatDateTime } from '@/app/admin/_lib/format';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';
import { countPositions, listPositions } from '@/lib/positions/queries';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';
import { truncate } from '@/lib/text';

import { DeletePositionButton } from './_components/DeletePositionButton';

export default async function AdminPositionMemoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page } = await adminPageSearchParamsCache.parse(searchParams);

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
      <AdminPageHeader breadcrumbs={[{ label: 'Position Memory' }]} />

      <AdminListSummary
        currentPage={currentPage}
        pageSize={DEFAULT_PAGE_SIZE}
        shownCount={rows.length}
        totalCount={totalCount}
        itemLabel="positions"
      />

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
              {formatDateTime(position.createdAt)}
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
