import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { eq } from 'drizzle-orm';

import { getOptionalUser } from '@/lib/auth';
import { db, positions, profiles } from '@/lib/db';
import { loadPuzzleForkSeed } from '@/lib/positions/fork';
import { loadAvailableTags } from '@/lib/positions/tag-loader';
import { resolveAuthorName } from '@/lib/users/display-name';
import { UUID_RE } from '@/lib/validations/uuid';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { GuestCreateGate } from '@/app/[locale]/_components/GuestCreateGate';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

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

export default async function NewPuzzlePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { from } = await searchParams;
  const user = await getOptionalUser();
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
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

  // Resolve fork source when ?from=<id> is present and the viewer is signed in.
  // Self-fork attempts get bounced to the source's detail page so the user lands
  // on the Edit affordance (which is what "fork your own puzzle" really means).
  // Guests see the un-seeded form behind GuestCreateGate; after they sign in, the
  // SSR re-runs and the seed loads naturally.
  const sourceId = typeof from === 'string' ? from : undefined;
  let forkSeed = undefined;
  if (sourceId && user && UUID_RE.test(sourceId)) {
    const [ownerRow] = await db
      .select({ userId: positions.userId })
      .from(positions)
      .where(eq(positions.id, sourceId))
      .limit(1);
    if (ownerRow?.userId === user.id) {
      redirect(`/${locale}/practice/puzzle/${sourceId}`);
    }
    const loaded = await loadPuzzleForkSeed({ sourceId, currentUserId: user.id });
    if (loaded) forkSeed = loaded;
  }

  const availableTags = await loadAvailableTags(locale);

  const form = (
    <CreatePuzzleForm
      displayName={displayName}
      disableUnsavedGuard={!user}
      availableThemes={availableTags.themes}
      availableChunks={availableTags.chunks}
      forkSeed={forkSeed}
    />
  );

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('title'), href: '/practice/puzzle' },
        { label: t('create.title') },
      ]}
    >
      <div className="space-y-6">
        <SectionTitle>{t('create.title')}</SectionTitle>
        {user ? form : <GuestCreateGate>{form}</GuestCreateGate>}
      </div>
    </PageLayout>
  );
}
