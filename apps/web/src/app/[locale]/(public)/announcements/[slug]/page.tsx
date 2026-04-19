import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
// Renamed to avoid conflict with Next.js route segment config `export const dynamic`
import nextDynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { Link } from '@/i18n/routing';

import { getOptionalUser } from '@/lib/auth';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPublishedAnnouncement } from '../_lib/queries';

export const dynamic = 'force-dynamic';

const MarkdownRenderer = nextDynamic(
  () =>
    import('@/app/_components/MarkdownRenderer').then((m) => ({
      default: m.MarkdownRenderer,
    })),
  { ssr: true }
);

type Props = {
  params: Promise<{
    locale: Locale;
    slug: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const result = await getPublishedAnnouncement(slug, locale);

  if (!result) {
    const t = await getTranslations({ locale, namespace: 'announcements' });
    return {
      title: resolveTitle(t('announcementNotFound'), locale),
    };
  }

  const { announcement, availableLocales } = result;
  const isFallback = announcement.locale !== locale;
  const title = announcement.title;
  const description = announcement.content.slice(0, 160).replace(/\n/g, ' ').trim();

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `announcements/${slug}`,
      title,
      description,
      availableLocales,
      ...(isFallback && {
        canonicalLocale: announcement.locale,
      }),
    }),
    title: resolveTitle(title, isFallback ? announcement.locale : locale),
    description,
  };
}

export default async function AnnouncementPage({ params }: Props) {
  const { locale, slug } = await params;
  const result = await getPublishedAnnouncement(slug, locale);
  const t = await getTranslations({ locale, namespace: 'announcements' });

  if (!result) {
    notFound();
  }

  const { announcement } = result;

  if (announcement.visibility === 'members_only') {
    const user = await getOptionalUser();

    if (!user) {
      return (
        <div className="space-y-8">
          <PageTitle>{announcement.title}</PageTitle>

          <PagePanel>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">{t('membersOnly')}</p>
              <Link
                href="/sign-in"
                locale={locale}
                className="text-link-primary hover:underline font-medium"
              >
                {t('signInToView')}
              </Link>
            </div>

            {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
              <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
            )}

            <Divider />

            <Breadcrumb
              items={[
                { label: t('pageTitle'), href: '/announcements' },
                { label: announcement.title },
              ]}
              locale={locale}
            />
          </PagePanel>
        </div>
      );
    }
  }

  const publishedDate = announcement.publishedAt
    ? new Date(announcement.publishedAt).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : undefined;

  return (
    <div className="space-y-8">
      <PageTitle>{announcement.title}</PageTitle>

      <PagePanel>
        <article className="prose prose-slate dark:prose-invert max-w-none break-words">
          <MarkdownRenderer content={announcement.content} skipFirstH1={true} />
        </article>

        {publishedDate && (
          <p className="text-sm text-muted-foreground text-right">{publishedDate}</p>
        )}

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}

        <Divider />

        <Breadcrumb
          items={[{ label: t('pageTitle'), href: '/announcements' }, { label: announcement.title }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
