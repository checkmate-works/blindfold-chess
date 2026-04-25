import { getTranslations } from 'next-intl/server';

import { eq } from 'drizzle-orm';

import { getAuthenticatedUser } from '@/lib/auth';
import { db, profiles } from '@/lib/db';
import { resolveAuthorName } from '@/lib/users/display-name';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { CreatePuzzleForm } from '../_components/CreatePuzzleForm';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const title = t('create.title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/puzzle/new', title }),
    title: resolveTitle(title, locale),
  };
}

export default async function NewPuzzlePage({ params }: Props) {
  const { locale } = await params;
  const user = await getAuthenticatedUser();
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const [profile] = await db
    .select({ displayName: profiles.displayName, username: profiles.username })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  const displayName = resolveAuthorName(profile, { fallback: '' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <div className="space-y-6">
          <SectionTitle>{t('create.title')}</SectionTitle>
          <CreatePuzzleForm displayName={displayName} />
        </div>

        <Divider />

        <Breadcrumb
          items={[
            { label: tNav('practice'), href: '/practice' },
            { label: t('title'), href: '/practice/puzzle' },
            { label: t('create.title') },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
