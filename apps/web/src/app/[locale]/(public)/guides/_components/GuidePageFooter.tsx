import { Divider } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
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
 *
 * The divider + breadcrumb pair is wrapped in `!mt-4 space-y-4` to match
 * `PageLayout`'s trailing-block spacing (see PageLayout.tsx). The AdSense
 * slot stays a sibling of the panel's `space-y-*` flow so it keeps the same
 * gap from the surrounding content.
 */
export function GuidePageFooter({ items, locale }: GuidePageFooterProps) {
  return (
    <>
      <AdSlot slot="content-bottom" />
      <div className="!mt-4 space-y-4">
        <Divider />
        <Breadcrumb items={items} locale={locale} density="compact" />
      </div>
    </>
  );
}
