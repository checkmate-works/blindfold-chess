import { getTranslations } from 'next-intl/server';

import { eq } from 'drizzle-orm';

import { getOptionalUser } from '@/lib/auth';
import { db, profiles } from '@/lib/db';
import { loadAvailableTags } from '@/lib/positions/tag-loader';
import { resolveAuthorName } from '@/lib/users/display-name';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { GuestCreateGate } from '@/app/[locale]/_components/GuestCreateGate';
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
  const user = await getOptionalUser();
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  let displayName = '';
  if (user) {
    const [profile] = await db
      .select({ displayName: profiles.displayName, username: profiles.username })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    displayName = resolveAuthorName(profile, { fallback: '' });
  }

  const availableTags = await loadAvailableTags(locale);

  const form = (
    <CreatePositionForm
      displayName={displayName}
      disableUnsavedGuard={!user}
      availableThemes={availableTags.themes}
      availableChunks={availableTags.chunks}
    />
  );

  return (
    <PageLayout
      title={t('list.title')}
      locale={locale}
      breadcrumb={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('list.title'), href: '/practice/position-memory' },
        { label: t('create.title') },
      ]}
    >
      <SectionTitle>{t('create.title')}</SectionTitle>
      {user ? form : <GuestCreateGate>{form}</GuestCreateGate>}
    </PageLayout>
  );
}
