import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getProfileByUsername } from './queries';

/** Which `publicProfile` message names the archive in its title. */
type ArchiveLabelKey = 'topicsTab' | 'gamesTab' | 'problemTypePuzzle' | 'problemTypeMemory';

/**
 * `<archive> - <member>` metadata for a page under `/u/[username]`.
 *
 * The four archive pages had a byte-identical generator apart from the label
 * and the path segment, so the title format and the canonical URL were a
 * convention each of them had to keep independently. An unknown username
 * yields `{}` — the page itself answers with `notFound()`.
 */
export async function buildProfileArchiveMetadata({
  locale,
  username,
  labelKey,
  segment,
}: {
  locale: Locale;
  username: string;
  labelKey: ArchiveLabelKey;
  /** Path below `/u/[username]`, e.g. `posts` or `problems/puzzles`. */
  segment: string;
}): Promise<Metadata> {
  const profile = await getProfileByUsername(username);
  if (!profile) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  return {
    title: resolveTitle(`${t(labelKey)} - ${profile.displayName ?? username}`, locale),
    alternates: {
      canonical: `/${locale}/u/${username}/${segment}`,
    },
  };
}
