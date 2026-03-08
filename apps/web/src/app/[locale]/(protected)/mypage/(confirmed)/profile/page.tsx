import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { Link } from '@/i18n/routing';
import { eq } from 'drizzle-orm';

import { db, profiles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

import { Breadcrumb, Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';

import { ProfileForm } from './_components';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.profile' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'mypage/profile' }),
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'profile' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/sign-in`);
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);

  if (!profile) {
    redirect(`/${locale}/mypage/setup-username`);
  }

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>
      <PagePanel>
        <Link
          href={`/@/${profile.username}`}
          className="inline-block text-sm text-primary hover:text-primary/80 transition-colors"
        >
          {t('viewPublicProfile')} &rarr;
        </Link>

        <ProfileForm locale={locale} profile={profile} />

        <Divider />

        <Breadcrumb
          locale={locale}
          items={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
        />
      </PagePanel>
    </div>
  );
}
