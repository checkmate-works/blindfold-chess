import { getTranslations } from 'next-intl/server';

import { getAdCreativeCopy, getAllAdCreatives } from '@/lib/ads/ad';

import { AdminPageLayout } from '../../_components/AdminPageLayout';
import { CreativeLinkGroupList } from '../_components/CreativeLinkGroupList';
import { groupCreativesByTitle } from '../_lib/link-groups';

/**
 * Set a book's link once for every slot it runs in. The per-creative edit
 * form still works for a single row; this page exists because one book is
 * many rows (one per slot, so the network's report can tell them apart) and
 * pasting the same link into each of them is where mistakes happen.
 */
export default async function AdminAdLinksPage() {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.adsManagement' });
  const creatives = await getAllAdCreatives();
  const copyById = await getAdCreativeCopy(creatives.map((c) => c.id));
  const englishTitleById = new Map(
    [...copyById].flatMap(([id, copy]) => (copy.title.en ? [[id, copy.title.en] as const] : []))
  );
  const groups = groupCreativesByTitle(creatives, englishTitleById);

  return (
    <AdminPageLayout
      breadcrumbs={[{ label: t('title'), href: '/admin/ads' }, { label: t('linksTitle') }]}
    >
      <div className="mb-4 space-y-1 text-sm text-muted-foreground">
        <p>{t('linksIntro')}</p>
        <p>{t('hrefHint')}</p>
      </div>
      <CreativeLinkGroupList
        groups={groups}
        // The templated labels go over raw: the client fills in the counts, and
        // `t()` would try to format `{count}` with no value to give it.
        labels={{
          hrefNotSet: t('hrefNotSet'),
          mixedLinks: t('linksMixed'),
          apply: t.raw('linksApply') as string,
          applied: t.raw('linksApplied') as string,
          slots: t('slot'),
          activeCount: t.raw('linksActiveCount') as string,
          empty: t('noCreatives'),
        }}
      />
    </AdminPageLayout>
  );
}
