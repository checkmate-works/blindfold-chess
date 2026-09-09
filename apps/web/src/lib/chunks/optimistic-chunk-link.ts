import type { AuthorProfile, IdentifiedAuthorProfile } from '@/lib/users/author-profile';

/**
 * Message for a chunk-link action's error code, on whichever surface links
 * chunks (a shared game's move, a repertoire line's position). Both surfaces
 * name the four outcomes identically under their own `errors.*` keys, so `t`
 * is the only thing that differs between them.
 */
export function localizeChunkLinkError(code: string, t: (key: string) => string): string {
  if (code === 'already_linked') return t('errors.alreadyLinked');
  if (code === 'chunk_not_available') return t('errors.chunkNotAvailable');
  if (code === 'rateLimited') return t('errors.rateLimited');
  return t('errors.generic');
}

/**
 * The suggester to show on a link the viewer just added, before a reload
 * would join it to their profile: the viewer's own public profile, so the
 * fresh card renders the same avatar and name it will after that reload.
 */
export function seedSuggester(viewer: IdentifiedAuthorProfile | null): AuthorProfile | null {
  return viewer
    ? {
        username: viewer.username,
        displayName: viewer.displayName,
        avatarUrl: viewer.avatarUrl,
      }
    : null;
}
