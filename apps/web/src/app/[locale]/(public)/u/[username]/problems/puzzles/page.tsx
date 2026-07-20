import type { Metadata } from 'next';

import type { Locale } from '@/app/[locale]/_lib/types';

import { ProblemsTypePage, generateProblemsTypeMetadata } from '../_components/ProblemsTypePage';

// Per-user, per-locale URLs explode the on-demand ISR cache (one entry per
// (locale, username, ?page=N)), and the 5-min revalidate cycle previously
// triggered ISR Writes on every bot/user revisit. Render dynamically instead —
// the parent /u/[username]/page.tsx already does the same.
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale; username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  return generateProblemsTypeMetadata(props, 'puzzle');
}

export default function PuzzlesPage(props: Props) {
  return <ProblemsTypePage {...props} type="puzzle" />;
}
