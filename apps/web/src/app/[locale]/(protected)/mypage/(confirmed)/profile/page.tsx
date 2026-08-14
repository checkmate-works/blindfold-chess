import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Link } from '@/i18n/routing';

import { getAuthenticatedUser } from '@/lib/auth';
import { getViewerProfile } from '@/lib/users/viewer-profile';

import { Divider, PageLayout } from '@/app/[locale]/_components';
import { TEXT_LINK_DESTRUCTIVE_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { ChangePasswordForm, ProfileForm } from './_components';

type Props = LocalePageProps;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'metadata.profile',
    path: 'mypage/profile',
    noIndex: true,
  });
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'profile' });

  const user = await getAuthenticatedUser();

  const profile = await getViewerProfile(user.id);

  if (!profile) {
    notFound();
  }

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
    >
      <div className="mb-4">
        <Link
          href={`/u/${profile.username}`}
          locale={locale}
          className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {t('viewPublicProfile', { username: profile.username })}
        </Link>
      </div>

      <ProfileForm locale={locale} profile={profile} />

      {user.app_metadata.providers?.includes('email') && (
        <>
          <Divider />
          <ChangePasswordForm />
        </>
      )}

      <Divider />

      <Link
        href="/mypage/delete-account"
        locale={locale}
        className={`inline-block text-sm ${TEXT_LINK_DESTRUCTIVE_CLASSES}`}
      >
        {t('deleteAccountLink')}
      </Link>
    </PageLayout>
  );
}
