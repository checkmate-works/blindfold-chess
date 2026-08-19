import type { SocialAuthorProfile } from '@/lib/users/author-profile';
import { buildProfileHref } from '@/lib/users/author-profile';

import { UserAvatar } from './UserAvatar';

type Props = {
  /** `null` for an anonymous or anonymised author — the avatar then renders unlinked. */
  author: SocialAuthorProfile | null | undefined;
  /** Already resolved by the caller, which owns the anonymous / deleted fallbacks. */
  displayName: string;
  locale: string;
};

/**
 * The author slot of an activity card: a small avatar with the name, flair
 * and country chips, linked to the profile.
 *
 * Every card that renders one — the four home-feed cards, the rank-update
 * card, the topic post card — passed the same seven props, so a chip added
 * to `SOCIAL_AUTHOR_COLUMNS` reached a card only once someone remembered to
 * widen its call too. That is the same failure the type itself was
 * introduced to close, one layer up.
 *
 * `CatalogListCard` deliberately stays outside this: it renders the avatar
 * without flair or country.
 */
export function CardAuthorAvatar({ author, displayName, locale }: Props) {
  return (
    <UserAvatar
      profileHref={buildProfileHref(author)}
      avatarUrl={author?.avatarUrl}
      displayName={displayName}
      locale={locale}
      size="sm"
      flair={author?.flair}
      country={author?.country}
    />
  );
}
