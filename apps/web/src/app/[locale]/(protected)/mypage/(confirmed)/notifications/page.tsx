import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { eq } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';
import { FiSettings } from 'react-icons/fi';

import { getAuthenticatedUser } from '@/lib/auth';
import { db, profiles } from '@/lib/db';
import { getMutedNotificationTypes } from '@/lib/notifications/mutes';

import { PageLayout, PaginationNav } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

import { MarkAllReadButton, NotificationItem } from './_components';
import { getNotifications, getUnreadCount } from './_lib/queries';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = LocaleSearchPageProps;

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    params,
    namespace: 'metadata.mypageNotifications',
    path: 'mypage/notifications',
    noIndex: true,
  });
}

export default async function NotificationsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageNotifications' });

  const user = await getAuthenticatedUser();
  const { page } = await searchParamsCache.parse(searchParams);
  const [[{ items, totalPages }, unreadCount, mutedTypes], [profile]] = await Promise.all([
    Promise.all([
      getNotifications(user.id, page),
      getUnreadCount(user.id),
      getMutedNotificationTypes(user.id),
    ]),
    db
      .select({ username: profiles.username })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1),
  ]);
  const mutedTypeSet = new Set<string>(mutedTypes);

  const currentPage = Math.max(1, Math.min(page, totalPages || 1));

  const buildHref = (p: number) => {
    const qs = p > 1 ? `?page=${p}` : '';
    return `/${locale}/mypage/notifications${qs}`;
  };

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
    >
      <div className="flex items-center justify-end gap-4">
        {unreadCount > 0 && <MarkAllReadButton label={t('markAllAsRead')} />}
        <Link
          href="/preferences?tab=notifications"
          locale={locale}
          aria-label={t('settingsLink')}
          title={t('settingsLink')}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <FiSettings className="h-4 w-4" />
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="space-y-3">
          {items.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              currentUsername={profile?.username}
              isTypeMuted={mutedTypeSet.has(notification.type)}
            />
          ))}
        </div>
      )}

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </PageLayout>
  );
}
