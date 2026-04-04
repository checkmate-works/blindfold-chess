import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

import { createOpeningPostRateLimit, isRateLimited } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

import { NewTopicPostLayout } from '@/app/[locale]/(public)/topics/_components/NewTopicPostLayout';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { MiniBoard } from '../../_components/MiniBoard';
import { getOpeningDisplayName } from '../../_lib/get-opening-display-name';
import { isBlackOpening } from '../../_lib/openings';
import { getOpeningBySlug } from '../../_lib/queries';
import { NewOpeningPostForm } from './_components';

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const opening = await getOpeningBySlug(slug);

  if (!opening) {
    return {};
  }

  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });
  const displayName = getOpeningDisplayName(nameT, slug, opening.name);

  const t = await getTranslations({ locale, namespace: 'metadata.topicsOpeningNewPost' });

  const title = t('title', { name: displayName });
  const description = t('description', { name: displayName });

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `topics/openings/${slug}/new`,
      title: title,
      description,
    }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function NewOpeningPostPage({ params }: Props) {
  const { locale, slug } = await params;
  const opening = await getOpeningBySlug(slug);

  if (!opening) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/sign-in?toast=sign_in_required`);
  }

  if (await isRateLimited(user.id, createOpeningPostRateLimit(slug))) {
    redirect(`/${locale}/topics/openings/${slug}?toast=rate_limited`);
  }

  const t = await getTranslations({ locale, namespace: 'topics' });
  const dt = await getTranslations({ locale, namespace: 'topics.openings.detail' });
  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });

  const displayName = getOpeningDisplayName(nameT, slug, opening.name);

  return (
    <NewTopicPostLayout
      locale={locale}
      pageTitle={dt('pageTitle')}
      sectionTitle={t('openings.newPostForm.title', { name: displayName })}
      topicVisual={
        <div className="max-w-xs mx-auto">
          <MiniBoard fen={opening.fen} responsive flipped={isBlackOpening(opening.fen)} />
        </div>
      }
      form={<NewOpeningPostForm locale={locale} slug={slug} />}
      breadcrumbItems={[
        { label: t('title'), href: '/topics' },
        { label: t('openings.title'), href: '/topics/openings' },
        { label: displayName, href: `/topics/openings/${slug}` },
        { label: t('openings.detail.newPost') },
      ]}
    />
  );
}
