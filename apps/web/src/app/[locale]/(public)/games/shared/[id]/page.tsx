/**
 * Shared Game detail (公開対局の詳細) — bare permalink.
 *
 * @description
 * Public permalink for a published blindfold game (default board orientation).
 * The orientation-suffixed variant lives at `[id]/[orientation]`; both render
 * the same `SharedGameDetailView`. Loaded by UUIDv7 id.
 */
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/app/[locale]/_lib/types';

import { SharedGameDetailView } from './_components/SharedGameDetailView';
import { buildSharedGameMetadata } from './_lib/page-metadata';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
  /** `?comment=<id>` deep-links to a specific comment (from a like notification). */
  searchParams: Promise<{ comment?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return buildSharedGameMetadata({ locale, id });
}

export default async function SharedGamePage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const { comment: highlightCommentId } = await searchParams;
  setRequestLocale(locale);

  return <SharedGameDetailView locale={locale} id={id} highlightCommentId={highlightCommentId} />;
}
