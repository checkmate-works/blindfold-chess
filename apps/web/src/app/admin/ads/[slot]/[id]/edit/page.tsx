import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AdminPageLayout } from '@/app/admin/_components/AdminPageLayout';
import { CreativeFormForKind } from '@/app/admin/ads/_components/CreativeFormForKind';
import { buildAdCreativeFormLabels } from '@/app/admin/ads/_lib/form-labels';
import type { CreativeFormInitial } from '@/app/admin/ads/_lib/use-common-creative-state';
import { eq } from 'drizzle-orm';

import { getAdCreativeCopy } from '@/lib/ads/ad';
import { isAdSlot, kindForSlot } from '@/lib/ads/registry';
import { thumbnailFromColumns } from '@/lib/ads/thumbnail';
import { adCreatives, db } from '@/lib/db';

type Props = { params: Promise<{ slot: string; id: string }> };

export default async function EditCreativePage({ params }: Props) {
  const { slot, id } = await params;
  if (!isAdSlot(slot)) notFound();

  const [row] = await db.select().from(adCreatives).where(eq(adCreatives.id, id)).limit(1);
  if (!row || row.slot !== slot) notFound();

  const [t, copyById] = await Promise.all([
    getTranslations({ locale: 'en', namespace: 'Admin.adsManagement' }),
    getAdCreativeCopy([id]),
  ]);
  const labels = buildAdCreativeFormLabels(t);
  const copy = copyById.get(id);

  const initial: CreativeFormInitial = {
    href: row.href,
    isActive: row.isActive,
    icon: row.icon,
    avatarImagePath: row.avatarImagePath,
    avatarAlt: row.avatarAlt,
    thumbnail: thumbnailFromColumns(row),
    title: copy?.title,
    description: copy?.description,
  };
  const kind = kindForSlot(slot);

  return (
    <AdminPageLayout
      breadcrumbs={[
        { label: t('title'), href: '/admin/ads' },
        { label: slot, href: `/admin/ads/${slot}` },
        { label: t('editTitle') },
      ]}
      /* The id is the sub-ID this creative's clicks are reported under, so it
         is the value an Awin report line has to be matched against — see the
         opening TSDoc of `@/lib/ads/subid`. */
      actions={
        <span className="font-mono text-xs text-muted-foreground">
          {t('creativeId')}: {id}
        </span>
      }
    >
      <CreativeFormForKind
        kind={kind}
        mode="edit"
        slot={slot}
        creativeId={id}
        labels={labels}
        initial={initial}
      />
    </AdminPageLayout>
  );
}
