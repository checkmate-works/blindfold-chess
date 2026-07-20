import { redirect } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  params: Promise<{ locale: Locale; username: string }>;
};

/**
 * Bare `/problems` has no default listing of its own — it always sends the
 * visitor to the puzzles sub-tab. Kept as a route (rather than omitted)
 * purely so a hand-typed or bookmarked `/problems` URL still lands
 * somewhere useful instead of 404ing.
 */
export default async function ProblemsIndexPage({ params }: Props) {
  const { username } = await params;
  redirect(`/u/${username}/problems/puzzles`);
}
