import Link from 'next/link';

import { AdminDataTable } from '@/app/admin/_components/AdminDataTable';
import { AdminPageHeader } from '@/app/admin/_components/AdminPageHeader';
import { AdminPaginationNav } from '@/app/admin/_components/AdminPaginationNav';
import { adminPageSearchParamsCache } from '@/app/admin/_lib/admin-search-params';
import { formatDateTime } from '@/app/admin/_lib/format';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { countChunks, listChunks } from '@/lib/chunks/queries';
import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';
import { truncate } from '@/lib/text';

import { DeleteChunkButton } from './_components/DeleteChunkButton';

export default async function AdminChunksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page } = await adminPageSearchParamsCache.parse(searchParams);

  const totalCount = await countChunks({});

  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    DEFAULT_PAGE_SIZE
  );

  const rows = await listChunks({ limit, offset });

  const buildHref = (p: number) => `/admin/chunks?page=${p}`;

  return (
    <div>
      <AdminPageHeader breadcrumbs={[{ label: 'Chunks' }]} />

      {rows.length > 0 && (
        <p className="text-sm text-muted-foreground mb-2">
          Showing {(currentPage - 1) * DEFAULT_PAGE_SIZE + 1}&ndash;
          {(currentPage - 1) * DEFAULT_PAGE_SIZE + rows.length} of {totalCount} chunks
        </p>
      )}

      <AdminDataTable
        headers={['Title', 'Board', 'Description', 'Created At', 'Actions']}
        items={rows}
        emptyMessage="No chunks found"
        renderRow={(chunk) => (
          <tr key={chunk.id} className="border-t border-border">
            <td className="px-4 py-3">
              <Link
                href={`/en/chunks/${chunk.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <span className="font-medium">{chunk.title}</span>
                <FaExternalLinkAlt className="h-3 w-3" />
              </Link>
            </td>
            <td className="px-4 py-3">
              <BoardThumbnail fen={chunk.representativeFen} className="w-20 h-20" />
            </td>
            <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
              {chunk.description ? truncate(chunk.description) : '-'}
            </td>
            <td className="px-4 py-3 text-muted-foreground text-sm">
              {formatDateTime(chunk.createdAt)}
            </td>
            <td className="px-4 py-3">
              <DeleteChunkButton id={chunk.id} title={chunk.title} />
            </td>
          </tr>
        )}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
