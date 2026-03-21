import type { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';

import { FiUser } from 'react-icons/fi';

type Props = {
  t: Awaited<ReturnType<typeof getTranslations<'landing'>>>;
  locale: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export function WelcomeCard({ t, locale, displayName, avatarUrl }: Props) {
  const initial = (displayName ?? '?').charAt(0).toUpperCase();

  return (
    <Link
      href={`/${locale}/mypage`}
      className="flex items-center gap-4 rounded-2xl bg-card border border-border shadow-sm p-4 hover:bg-accent transition-colors w-full sm:w-auto sm:min-w-[28rem] max-w-full"
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={displayName ?? ''}
          width={48}
          height={48}
          className="w-12 h-12 rounded-full object-cover shrink-0"
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
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <FiUser className="w-3.5 h-3.5" />
          {t('dashboard.viewMypage')}
        </p>
      </div>
    </Link>
  );
}
