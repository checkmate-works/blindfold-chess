/**
 * Announcement Detail (お知らせ詳細, `/announcements/[slug]`)
 *
 * @description
 * Renders one published announcement's markdown body, gating members-only announcements behind sign-in.
 * Signed-in readers can like it; admin compares cumulative positive reactions
 * per slug. This is not a satisfaction rate: guest reactions and exposure are
 * not measured, and publication periods and audiences differ. We do not add
 * page-view counting here because historical exposure cannot be reconstructed;
 * mixing old likes with newly collected views would produce a misleading rate.
 */
import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { LazyMarkdownRenderer } from '@/app/_components/LazyMarkdownRenderer';
import { Link, routing } from '@/i18n/routing';

import { getOptionalUser } from '@/lib/auth';
import { withReturnPath } from '@/lib/auth-return-path';
import { getCurrentReturnTarget } from '@/lib/current-return-target';
import { getAnnouncementLikeMeta } from '@/lib/db/announcement-likes';
import { formatLocalDate } from '@/lib/i18n/format-date';
import { toMetaDescription } from '@/lib/seo/meta-description';

import { PageLayout } from '@/app/[locale]/_components';
import { ProseArticle } from '@/app/[locale]/_components/ProseArticle';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPublishedAnnouncement } from '../_lib/queries';
import { AnnouncementLikeButton } from './_components/AnnouncementLikeButton';

export const dynamic = 'force-dynamic';

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
  // A members-only body must not reach the head: the page gates it behind
  // sign-in, but metadata is served to everyone, crawlers included, so a
  // description derived from the content — and the og:description built from
  // it — would publish what the gate withholds. The title stays, since the
  // listing and the sign-in prompt already show it to anonymous readers. The
  // decision is per announcement, not per viewer: a crawler is never signed
  // in, and what an anonymous visitor can index here is only that prompt.
  const isMembersOnly = announcement.visibility === 'members_only';
  const description = isMembersOnly ? undefined : toMetaDescription(announcement.content);

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
  const user = await getOptionalUser();

  if (announcement.visibility === 'members_only') {
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
            <Link
              href={withReturnPath('/sign-in', await getCurrentReturnTarget())}
              locale={locale}
              className={`font-medium ${TEXT_LINK_CLASSES}`}
            >
              {t('signInToView')}
            </Link>
          </div>
        </PageLayout>
      );
    }
  }

  const likeMeta = await getAnnouncementLikeMeta(announcement.slug, user?.id);

  const publishedDate = announcement.publishedAt
    ? formatLocalDate(new Date(announcement.publishedAt), locale, 'long')
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
      <ProseArticle className="break-words">
        <LazyMarkdownRenderer content={announcement.content} skipFirstH1={true} />
      </ProseArticle>

      <div className="flex items-center justify-between gap-4">
        <AnnouncementLikeButton
          slug={announcement.slug}
          locale={locale}
          initialLikeCount={likeMeta.likeCount}
          initialLikedByMe={likeMeta.likedByMe}
        />
        {publishedDate && <p className="text-sm text-muted-foreground">{publishedDate}</p>}
      </div>
    </PageLayout>
  );
}
