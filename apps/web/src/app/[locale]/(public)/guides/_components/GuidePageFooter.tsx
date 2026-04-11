import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';

import { Divider } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

type GuidePageFooterProps = {
  items: BreadcrumbItem[];
  locale: Locale;
};

/**
 * Shared footer block for every `/guides/...` Server Component.
 *
 * Renders (in order):
 * 1. The `content-bottom` AdSense slot (gated by env + local-dev flag)
 * 2. A horizontal divider
 * 3. A breadcrumb with the supplied items
 *
 * Extracted so that `renderGuideBody`'s three layout branches and the
 * `/guides` hub top page do not duplicate the same AdSense + Divider +
 * Breadcrumb triple — only the breadcrumb items differ between call sites.
 */
export function GuidePageFooter({ items, locale }: GuidePageFooterProps) {
  return (
    <>
      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
      <Divider />
      <Breadcrumb items={items} locale={locale} />
    </>
  );
}
