'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { HiLockClosed } from 'react-icons/hi2';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

/**
 * Lock indicator shown on `members_only` announcements to anonymous
 * visitors only. Lives in a client component so the announcements list
 * page can stay free of cookie-reading server APIs (`getOptionalUser`) and
 * be served from the ISR cache. Returns `null` once the auth state
 * resolves to a signed-in user; the empty slot left in the DOM is
 * collapsed by `empty:hidden` on the parent chip in `ListLink`.
 *
 * Initial SSR/ISR render shows the badge (auth context defaults to
 * `user: null` until `getSessionUser()` resolves on the client), which
 * matches the crawler view of the page.
 */
export function MembersOnlyBadge() {
  const { user } = useAuth();
  const t = useTranslations('announcements');

  if (user) return null;

  return (
    <>
      <HiLockClosed className="size-3" /> {t('membersOnlyBadge')}
    </>
  );
}
