import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getProfileByUsername } from './queries';

/** Which `publicProfile` message names the archive in its title. */
type ArchiveLabelKey =
  | 'topicsTab'
  | 'gamesTab'
  | 'problemTypePuzzle'
  | 'problemTypeMemory'
  | 'achievementsPageTitle'
  | 'followersPageTitle';

/**
 * `<archive> - <member>` metadata for a page under `/u/[username]`.
 *
 * The archive pages had a byte-identical generator apart from the label and
 * the path segment, so the title format and the canonical URL were a
 * convention each of them had to keep independently. An unknown username
 * yields `{}` — the page itself answers with `notFound()`.
 *
 * The canonical and the hreflang `alternates.languages` come from
 * `generateCanonicalMetadata`, like every other page: the root layout
 * declares no `alternates` of its own, so a page that writes only a
 * `canonical` ships no hreflang at all, and the other locales' pages (which
 * all list every locale) then point at a page that does not point back.
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
  const title = `${t(labelKey)} - ${profile.displayName || username}`;

  return {
    ...generateCanonicalMetadata({ locale, path: `/u/${username}/${segment}`, title }),
    title: resolveTitle(title, locale),
  };
}
