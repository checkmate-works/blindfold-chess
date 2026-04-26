import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getChunkBySlug, getLinkedPositionsForChunk } from '@/lib/chunks/queries';
import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
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
    <div className="space-y-8">
      <PageTitle>{chunk.title}</PageTitle>

      <PagePanel>
        {chunk.description && (
          <>
            <SectionTitle>Description</SectionTitle>
            <p className="text-muted-foreground">{chunk.description}</p>
          </>
        )}

        <div className="max-w-xs mx-auto">
          <ThemedBoardThumbnail fen={chunk.representativeFen} className="w-full" />
        </div>

        {linkedPositions.length > 0 && (
          <>
            <SectionTitle>Positions</SectionTitle>
            <p className="text-sm text-muted-foreground">
              Problems where this chunk pattern is effective.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {linkedPositions.map((position) => (
                <Link
                  key={position.id}
                  href={`/${locale}/practice/position-memory/${position.id}`}
                  className="block p-4 rounded border border-border hover:bg-muted transition-colors"
                >
                  <ThemedBoardThumbnail fen={position.fen} className="w-full mb-2" />
                  <p className="text-sm font-medium truncate">{position.title}</p>
                </Link>
              ))}
            </div>
          </>
        )}

        <Divider />

        <Breadcrumb
          items={[{ label: 'Chunks', href: '/chunks' }, { label: chunk.title }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
