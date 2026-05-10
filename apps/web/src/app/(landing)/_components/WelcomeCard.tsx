import type { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';

import { FiHome, FiUser } from 'react-icons/fi';

type Props = {
  t: Awaited<ReturnType<typeof getTranslations<'landing'>>>;
  locale: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export function WelcomeCard({ t, locale, displayName, avatarUrl }: Props) {
  const initial = (displayName ?? '?').charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-card border border-border p-4 w-full sm:w-auto sm:min-w-[28rem] max-w-full">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={displayName ?? ''}
          width={48}
          height={48}
          className="w-12 h-12 rounded-full object-cover shrink-0"
          // Pre-resized 256×256 WebP at upload; bypass Vercel optimization.
          unoptimized
        />
      ) : (
        <span className="flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground text-lg font-semibold shrink-0">
          {initial}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-foreground truncate">
          {t('dashboard.welcomeGreeting', {
            name: displayName ?? t('dashboard.welcomeDefaultName'),
          })}
        </p>
        <nav
          className="mt-2 text-sm text-muted-foreground flex items-center gap-5"
          aria-label="Quick links"
        >
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <FiHome className="w-3.5 h-3.5" />
            {t('dashboard.viewHome')}
          </Link>
          <Link
            href={`/${locale}/mypage`}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <FiUser className="w-3.5 h-3.5" />
            {t('dashboard.viewMypage')}
          </Link>
        </nav>
      </div>
    </div>
  );
}
