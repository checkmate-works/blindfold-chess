import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';

import { PostCard } from '@/app/[locale]/(public)/topics/squares/_components';
import { getLikedPostsByUser } from '@/app/[locale]/(public)/topics/squares/_lib/queries';
import { Breadcrumb, Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.mypageLikes' });

  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function LikesPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageLikes' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const posts = await getLikedPostsByUser(user!.id);

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>
      <PagePanel>
        {posts.length === 0 ? (
          <p className="text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                locale={locale}
                square={post.topicKey}
                showSquareBadge
              />
            ))}
          </div>
        )}

        <Divider />

        <Breadcrumb
          locale={locale}
          items={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
        />
      </PagePanel>
    </div>
  );
}
