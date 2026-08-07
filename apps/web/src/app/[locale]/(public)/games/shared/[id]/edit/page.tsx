/**
 * Edit Shared Game (公開対局の編集)
 *
 * @description
 * Owner-only edit page for a shared game's title / description, on a dedicated
 * page to match the publish flow. Ownership is re-checked client-side
 * (registered via session, or account-less via the manage token) and the update
 * action re-authorizes server-side.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getGameById } from '@/lib/db/games-read';
import { createClient } from '@/lib/supabase/server';
import { UUID_RE } from '@/lib/validations/uuid';

import { PageLayout } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { EditGameClient } from './_components/EditGameClient';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'sharedGames' });
  const title = t('edit.title');

  return {
    ...generateCanonicalMetadata({ locale, path: `games/shared/${id}/edit`, title }),
    title: resolveTitle(title, locale),
  };
}

export default async function EditSharedGamePage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (!UUID_RE.test(id)) notFound();

  const [detail, t, supabase] = await Promise.all([
    getGameById(id),
    getTranslations({ locale, namespace: 'sharedGames' }),
    createClient(),
  ]);
  if (!detail) notFound();

  const { game } = detail;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isRegisteredOwner = game.authorId != null && user?.id === game.authorId;

  return (
    <PageLayout
      title={t('edit.title')}
      locale={locale}
      breadcrumb={[
        { label: t('list.title'), href: '/games/shared' },
        { label: game.title, href: `/games/shared/${id}` },
        { label: t('edit.title') },
      ]}
    >
      <EditGameClient
        gameId={id}
        initialTitle={game.title}
        initialDescription={game.description ?? ''}
        isRegisteredOwner={isRegisteredOwner}
        locale={locale}
      />
    </PageLayout>
  );
}
