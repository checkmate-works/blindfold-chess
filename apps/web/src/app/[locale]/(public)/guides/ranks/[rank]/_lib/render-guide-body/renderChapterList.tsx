import type { ReactNode } from 'react';

import { buildChapterHref } from '@/lib/guides';
import type { ChapteredGuide } from '@/lib/guides';
import { JsonLd } from '@/lib/seo/jsonld';

import { GuidePageFooter } from '@/app/[locale]/(public)/guides/_components/GuidePageFooter';
import { GuideLinkCard } from '@/app/[locale]/(public)/ranks/_components/GuideLinkCard';
import { RankHeader } from '@/app/[locale]/(public)/ranks/_components/RankHeader';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';

import { buildChapterListBreadcrumbs, buildChapterListItemListSchema } from '../guide-metadata';
import type { GuideContext } from './context';

export function renderChapterList(ctx: GuideContext, guide: ChapteredGuide): ReactNode {
  const { locale, rankSlug, rankName, beltColor, tGuides } = ctx;

  const breadcrumbItems = buildChapterListBreadcrumbs(tGuides, rankName);
  const itemListSchema = buildChapterListItemListSchema(locale, rankSlug, guide);

  return (
    <>
      <JsonLd data={itemListSchema} />
      <PageLayout title={rankName} locale={locale}>
        <RankHeader beltColor={beltColor}>{tGuides('ranks.indexTitle')}</RankHeader>

        <SectionTitle>{tGuides('ranks.chapterListHeading')}</SectionTitle>
        <ul className="mt-4 space-y-3">
          {guide.chapters.map((chapter) => (
            <li key={chapter.slug}>
              <GuideLinkCard
                items={[
                  {
                    label: chapter.title,
                    href: buildChapterHref(locale, rankSlug, chapter.slug, 1),
                    description: chapter.description,
                  },
                ]}
              />
            </li>
          ))}
        </ul>

        <GuidePageFooter locale={locale} items={breadcrumbItems} />
      </PageLayout>
    </>
  );
}
