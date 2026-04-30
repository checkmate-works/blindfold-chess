import { getTranslations } from 'next-intl/server';

import { eq } from 'drizzle-orm';

import { getAuthenticatedUser } from '@/lib/auth';
import { db, profiles } from '@/lib/db';
import { resolveAuthorName } from '@/lib/users/display-name';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { CreatePositionForm } from '../_components/CreatePositionForm';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const title = t('create.title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/position-memory/new', title }),
    title: resolveTitle(title, locale),
  };
}

export default async function NewPositionPage({ params }: Props) {
  const { locale } = await params;
  const user = await getAuthenticatedUser();
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const [profile] = await db
    .select({ displayName: profiles.displayName, username: profiles.username })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  const displayName = resolveAuthorName(profile, { fallback: '' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('list.title')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('create.title')}</SectionTitle>
        <CreatePositionForm displayName={displayName} />

        <Divider />

        <Breadcrumb
          items={[
            { label: tNav('practice'), href: '/practice' },
            { label: t('list.title'), href: '/practice/position-memory' },
            { label: t('create.title') },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
