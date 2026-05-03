import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
// Renamed to avoid conflict with Next.js route segment config `export const dynamic`
import nextDynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { Link, routing } from '@/i18n/routing';

import { getOptionalUser } from '@/lib/auth';

import { PageLayout } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
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
  // Narrow DB-sourced `locale` values (typed as plain `string`) to the
  // `Locale` union before handing them to the exhaustive metadata helpers.
  // Unknown values are filtered out of `availableLocales` (rather than
  // falling back silently) so the hreflang set never advertises an
  // unsupported locale.
  const narrowedAvailableLocales = availableLocales.filter((l): l is Locale =>
    hasLocale(routing.locales, l)
  );
  const announcementLocale: Locale | undefined = hasLocale(routing.locales, announcement.locale)
    ? announcement.locale
    : undefined;
  const isFallback = announcementLocale !== locale;
  const title = announcement.title;
  const description = announcement.content.slice(0, 160).replace(/\n/g, ' ').trim();

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `announcements/${slug}`,
      title,
      description,
      availableLocales: narrowedAvailableLocales,
      ...(isFallback &&
        announcementLocale && {
          canonicalLocale: announcementLocale,
        }),
    }),
    title: resolveTitle(title, isFallback && announcementLocale ? announcementLocale : locale),
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
        <PageLayout
          title={announcement.title}
          locale={locale}
          breadcrumb={[
            { label: t('pageTitle'), href: '/announcements' },
            { label: announcement.title },
          ]}
        >
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{t('membersOnly')}</p>
            <Link href="/sign-in" locale={locale} className={`font-medium ${TEXT_LINK_CLASSES}`}>
              {t('signInToView')}
            </Link>
          </div>

          {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
            <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
          )}
        </PageLayout>
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
    <PageLayout
      title={announcement.title}
      locale={locale}
      breadcrumb={[
        { label: t('pageTitle'), href: '/announcements' },
        { label: announcement.title },
      ]}
    >
      <article className="prose prose-slate dark:prose-invert max-w-none break-words">
        <MarkdownRenderer content={announcement.content} skipFirstH1={true} />
      </article>

      {publishedDate && <p className="text-sm text-muted-foreground text-right">{publishedDate}</p>}

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
    </PageLayout>
  );
}
