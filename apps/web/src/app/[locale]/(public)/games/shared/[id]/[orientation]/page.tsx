/**
 * Shared Game detail with an explicit board orientation in the path
 * (`/games/shared/[id]/white` | `/black`), Lichess-style (`…/white#14`). The
 * sibling static `edit` route still wins for `/[id]/edit`; any other segment
 * here that is not `white`/`black` is a 404. Renders the same
 * `SharedGameDetailView` as the bare permalink, only seeding the orientation.
 */
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { SharedGameDetailView } from '../_components/SharedGameDetailView';
import { buildSharedGameMetadata } from '../_lib/page-metadata';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale; id: string; orientation: string }>;
  /** `?comment=<id>` deep-links to a specific comment (from a like notification). */
  searchParams: Promise<{ comment?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return buildSharedGameMetadata({ locale, id });
}

export default async function SharedGameOrientationPage({ params, searchParams }: Props) {
  const { locale, id, orientation } = await params;
  const { comment: highlightCommentId } = await searchParams;
  setRequestLocale(locale);

  if (orientation !== 'white' && orientation !== 'black') notFound();

  return (
    <SharedGameDetailView
      locale={locale}
      id={id}
      highlightCommentId={highlightCommentId}
      orientation={orientation}
    />
  );
}
