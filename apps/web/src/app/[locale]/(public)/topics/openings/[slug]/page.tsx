import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';

import { createOpeningPostRateLimit, isRateLimited } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { MiniBoard } from '../_components/MiniBoard';
import { getOpeningBySlug, getPostsForOpening } from '../_lib/queries';
import { OpeningPostCard } from './_components';

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
  const translated = nameT(slug as never);
  const displayName = translated === `topics.openings.names.${slug}` ? opening.name : translated;

  const t = await getTranslations({ locale, namespace: 'metadata.topicsOpeningDetail' });

  return {
    ...generateCanonicalMetadata({ locale, path: `topics/openings/${slug}` }),
    title: t('title', { name: displayName }),
    description: t('description', { name: displayName }),
  };
}

export default async function OpeningDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const opening = await getOpeningBySlug(slug);

  if (!opening) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'topics' });
  const dt = await getTranslations({ locale, namespace: 'topics.openings.detail' });
  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });

  const translated = nameT(slug as never);
  const displayName = translated === `topics.openings.names.${slug}` ? opening.name : translated;

  const posts = await getPostsForOpening(slug);

  // TODO: Support draft saving so users can compose a post without immediately publishing.
  // When drafts are implemented, the rate-limit gate below should allow navigating to the
  // form for draft editing even when the user has already posted today.

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const showNewPostButton =
    !user || !(await isRateLimited(user.id, createOpeningPostRateLimit(slug)));

  return (
    <div className="space-y-8">
      <PageTitle>{dt('pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>{displayName}</SectionTitle>

        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <MiniBoard fen={opening.fen} size={160} />
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">{dt('ecoCode')}: </span>
              <span className="font-mono font-medium text-foreground">{opening.ecoCode}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{dt('moves')}: </span>
              <span className="font-mono text-foreground">{opening.pgn}</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{dt('postCount', { count: posts.length })}</p>

        {showNewPostButton && (
          <div>
            <Link href={`/topics/openings/${slug}/new`} locale={locale}>
              <Button variant="primary" asChild>
                {dt('newPost')}
              </Button>
            </Link>
          </div>
        )}

        {posts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{dt('noPosts')}</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <OpeningPostCard key={post.id} post={post} locale={locale} />
            ))}
          </div>
        )}

        <Divider />

        <Breadcrumb
          items={[
            { label: t('title'), href: '/topics' },
            { label: t('openings.title'), href: '/topics/openings' },
            { label: displayName },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
