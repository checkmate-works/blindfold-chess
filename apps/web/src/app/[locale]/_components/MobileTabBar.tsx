'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

const SCROLL_DEAD_ZONE = 10;

export function MobileTabBar() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('MobileTabBar');

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const diff = currentScrollY - lastScrollY.current;

    if (Math.abs(diff) < SCROLL_DEAD_ZONE) {
      return;
    }

    if (diff > 0) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }

    lastScrollY.current = currentScrollY;
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <ul className="flex items-center justify-around px-2 py-1">
        {TAB_ITEMS.map((item) => {
          const href = `/${locale}${item.path}`;
          const isActive = pathname.startsWith(href);
          return (
            <li key={item.labelKey}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] transition-colors ${
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
