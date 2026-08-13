'use client';

import { useEffect, useRef, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiLogOut, FiSettings, FiUser } from 'react-icons/fi';

import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

import { useAuth } from '../_contexts/AuthContext';
import { AuthCtaLink } from './AuthCtaLink';

type Props = {
  isAuthenticated: boolean;
  avatarUrl?: string | null;
  displayName?: string | null;
};

export function AuthStatusDisplay({ isAuthenticated, avatarUrl, displayName }: Props) {
  const { user, signOut } = useAuth();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('AuthStatusDisplay');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  if (isAuthenticated) {
    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          className="flex items-center justify-center rounded-full hover:opacity-80 transition-opacity"
          aria-label={t('account')}
          aria-expanded={isOpen}
          aria-haspopup="true"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName ?? ''}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
              // Pre-resized 256×256 WebP at upload; bypass Vercel optimization.
              unoptimized
            />
          ) : (
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-xs">
              {(displayName ?? user?.email ?? '?').charAt(0).toUpperCase()}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-lg border border-border bg-card">
            {/*
              Low-intent links: opt out of viewport prefetch. Opening the menu
              puts both entries on screen at once, and both destinations are
              dynamic — so the default prefetches two Edge auth round trips and
              two partial renders to serve at most one click.
            */}
            <div className="py-1">
              <Link
                href={`/${locale}/mypage`}
                prefetch={false}
                className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <FiUser className="h-4 w-4" />
                {t('mypage')}
              </Link>
              <Link
                href={`/${locale}/preferences`}
                prefetch={false}
                className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <FiSettings className="h-4 w-4" />
                {t('settings')}
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent transition-colors"
                onClick={async () => {
                  setIsOpen(false);
                  await signOut();
                  router.push(`/${locale}?toast=logout_success`);
                }}
              >
                <FiLogOut className="h-4 w-4" />
                {t('signOut')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <AuthCtaLink to="/sign-up" className={TEXT_LINK_CLASSES}>
        {t('signUp')}
      </AuthCtaLink>
      <AuthCtaLink to="/sign-in" className={TEXT_LINK_CLASSES}>
        {t('signIn')}
      </AuthCtaLink>
    </div>
  );
}
