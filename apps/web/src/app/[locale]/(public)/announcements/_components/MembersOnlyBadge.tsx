import { getTranslations } from 'next-intl/server';

import { HiLockClosed } from 'react-icons/hi2';

type Props = {
  locale: string;
};

/**
 * Lock chip marking an announcement whose body is members-only.
 *
 * The chip describes the announcement, not the reader, so every visitor sees
 * it — signed in or not. It used to read `useAuth` and return `null` once the
 * client resolved a signed-in user, which bought a member nothing (they can
 * open the post either way) while making one announcement look different
 * depending on who was looking. What is worth reading off the chip is that the
 * post is gated at all, and that is true for everyone.
 *
 * Dropping the auth read is also what lets the landing page render this. `/`
 * is its own root layout and deliberately mounts no `AuthProvider`, so a
 * `useAuth` call there throws outright. With no viewer state left the chip is
 * a plain Server Component, which is in turn why the `announcements` messages
 * no longer ship in any client dictionary.
 */
export async function MembersOnlyBadge({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'announcements' });

  return (
    <>
      <HiLockClosed className="size-3" /> {t('membersOnlyBadge')}
    </>
  );
}
