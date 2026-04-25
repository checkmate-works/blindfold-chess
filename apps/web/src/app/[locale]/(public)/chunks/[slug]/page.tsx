import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getChunkBySlug, getLinkedPositionsForChunk } from '@/lib/chunks/queries';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

import { PagePanel, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
    slug: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const chunk = await getChunkBySlug(slug);

  if (!chunk) {
    return {
      title: resolveTitle('Not Found', locale),
    };
  }

  return {
    title: resolveTitle(chunk.title, locale),
    ...(chunk.description && { description: chunk.description }),
    ...generateCanonicalMetadata({
      locale,
      path: `chunks/${slug}`,
      title: chunk.title,
      description: chunk.description ?? undefined,
    }),
  };
}

export default async function ChunkDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const chunk = await getChunkBySlug(slug);

  if (!chunk) {
    notFound();
  }

  const linkedPositions = await getLinkedPositionsForChunk(chunk.id);

  return (
    <PagePanel>
      <PageTitle>{chunk.title}</PageTitle>

      {chunk.description && <p className="text-muted-foreground mt-2 mb-6">{chunk.description}</p>}

      <div className="w-64 my-6">
        <BoardThumbnail fen={chunk.representativeFen} className="w-full" />
      </div>

      {linkedPositions.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Positions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {linkedPositions.map((position) => (
              <Link
                key={position.id}
                href={`/${locale}/practice/position-memory/${position.id}`}
                className="block p-4 rounded border border-border hover:bg-muted transition-colors"
              >
                <BoardThumbnail fen={position.fen} className="w-full mb-2" />
                <p className="text-sm font-medium truncate">{position.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </PagePanel>
  );
}
