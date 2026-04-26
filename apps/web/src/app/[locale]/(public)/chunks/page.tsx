import type { Metadata } from 'next';

import { Link } from '@/i18n/routing';
import { truncateContent } from '@blindfold-chess/features/utils';

import { countChunks, listChunks } from '@/lib/chunks/queries';
import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: resolveTitle('Chunks', locale),
    ...generateCanonicalMetadata({
      locale,
      path: 'chunks',
      title: 'Chunks',
    }),
  };
}

function DescriptionPreview({ description }: { description: string }) {
  const preview = truncateContent(description, 100);
  const isTruncated = preview !== description;
  return (
    <>
      <p className="text-sm text-muted-foreground mt-1">{preview}</p>
      {isTruncated && <span className="text-sm text-link-primary hover:underline">Show more</span>}
    </>
  );
}

export default async function ChunksListPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const page = Number(sp.page) || 1;

  const totalCount = await countChunks({ includeDeleted: false });
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    DEFAULT_PAGE_SIZE
  );

  const rows = await listChunks({ includeDeleted: false, limit, offset });

  return (
    <div className="space-y-8">
      <PageTitle>Chunks</PageTitle>

      <PagePanel>
        <SectionTitle>Chess piece-coordination patterns</SectionTitle>

        {rows.length === 0 && <p className="text-muted-foreground">No chunks yet.</p>}

        {rows.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {rows.map((chunk) => (
              <Link
                key={chunk.id}
                href={`/chunks/${chunk.slug}` as '/chunks/[slug]'}
                locale={locale}
                className="block p-4 rounded border border-border hover:bg-muted transition-colors"
              >
                <BoardThumbnail fen={chunk.representativeFen} className="w-full mb-3" />
                <p className="font-medium truncate">{chunk.title}</p>
                {chunk.description && <DescriptionPreview description={chunk.description} />}
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <PaginationNav
            currentPage={currentPage}
            totalPages={totalPages}
            buildHref={(p) => `/${locale}/chunks?page=${p}`}
          />
        )}

        <Divider />

        <Breadcrumb items={[{ label: 'Chunks' }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
