'use client';

import { useEffect, useRef, useState } from 'react';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { FaRegUser } from 'react-icons/fa';
import { FiLogOut, FiSettings, FiUser } from 'react-icons/fi';

import { useAuth } from '../_contexts/AuthContext';

export function AuthStatusDisplay() {
  const { user, isLoading, signOut } = useAuth();
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

  if (isLoading) {
    return null;
  }

  if (user) {
    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t('account')}
          aria-expanded={isOpen}
          aria-haspopup="true"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <FaRegUser className="h-5 w-5" />
        </button>

        {isOpen && (
          <div className="fixed top-16 right-0 w-48 border-l border-b border-border bg-card shadow-lg">
            <div className="py-1">
              <Link
                href={`/${locale}/mypage`}
                className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <FiUser className="h-4 w-4" />
                {t('mypage')}
              </Link>
              <Link
                href={`/${locale}/preferences`}
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

  // TODO: Restore sign-in link when authentication is publicly launched
  return null;
}
