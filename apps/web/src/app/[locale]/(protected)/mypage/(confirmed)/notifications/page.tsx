import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { eq } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getAuthenticatedUser } from '@/lib/auth';
import { db, profiles } from '@/lib/db';

import { PageLayout, PaginationNav } from '@/app/[locale]/_components';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

import { MarkAllReadButton, NotificationItem } from './_components';
import { getNotifications, getUnreadCount } from './_lib/queries';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = LocaleSearchPageProps;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.mypageNotifications' });

  return {
    title: resolveTitle(t('title'), locale),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function NotificationsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageNotifications' });

  const user = await getAuthenticatedUser();
  const { page } = await searchParamsCache.parse(searchParams);
  const [[{ items, totalPages }, unreadCount], [profile]] = await Promise.all([
    Promise.all([getNotifications(user.id, page), getUnreadCount(user.id)]),
    db
      .select({ username: profiles.username })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1),
  ]);

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
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <MarkAllReadButton label={t('markAllAsRead')} />
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="space-y-3">
          {items.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              currentUsername={profile?.username}
            />
          ))}
        </div>
      )}

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </PageLayout>
  );
}
