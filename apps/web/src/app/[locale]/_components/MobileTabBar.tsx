'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { NavigationIconName } from '@/app/[locale]/_lib/types';

import { getIcon } from '../_lib/icon-mapping';

const TAB_ITEMS: ReadonlyArray<{
  labelKey: string;
  path: string;
  iconName: NavigationIconName;
}> = [
  { labelKey: 'games', path: '/games', iconName: 'games' },
  { labelKey: 'practice', path: '/practice', iconName: 'practice' },
  { labelKey: 'topics', path: '/topics', iconName: 'topics' },
  // /mypage is a protected route. Unauthenticated users will be redirected
  // to sign-in by the (protected) layout's auth guard — this is intentional.
  { labelKey: 'mypage', path: '/mypage', iconName: 'home' },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('MobileTabBar');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <ul className="flex items-center justify-around px-2 py-2">
        {TAB_ITEMS.map((item) => {
          const href = `/${locale}${item.path}`;
          const isActive = pathname.startsWith(href);
          return (
            <li key={item.labelKey}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors ${
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {getIcon(item.iconName)}
                <span>{t(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
