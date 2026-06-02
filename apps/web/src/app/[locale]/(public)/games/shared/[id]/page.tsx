/**
 * Shared Game detail (公開対局の詳細).
 *
 * @description
 * Public permalink for a published blindfold game. The board orientation rides
 * in a `?color=white|black` query param (read here, kept in sync client-side)
 * and the move on the board in the `#` hash; both are shareable. Loaded by
 * UUIDv7 id.
 */
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/app/[locale]/_lib/types';

import { SharedGameDetailView } from './_components/SharedGameDetailView';
import { buildSharedGameMetadata } from './_lib/page-metadata';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
  /**
   * `?comment=<id>` deep-links to a specific comment (from a like notification);
   * `?color=white|black` opens with that side at the bottom of the board.
   * (`?toast=game_published` from the publish redirect is consumed by the global
   * ToastContainer, not here — the detail always opens at the opening board.)
   */
  searchParams: Promise<{ comment?: string; color?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return buildSharedGameMetadata({ locale, id });
}

export default async function SharedGamePage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const { comment: highlightCommentId, color } = await searchParams;
  const orientation = color === 'white' || color === 'black' ? color : undefined;
  setRequestLocale(locale);

  return (
    <SharedGameDetailView
      locale={locale}
      id={id}
      highlightCommentId={highlightCommentId}
      orientation={orientation}
    />
  );
}
