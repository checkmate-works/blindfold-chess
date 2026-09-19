import { Divider } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

type GuidePageFooterProps = {
  items: BreadcrumbItem[];
  locale: Locale;
};

/**
 * Shared footer block for every `/dojo/guides/...` Server Component: a
 * horizontal divider above a breadcrumb with the supplied items.
 *
 * Extracted so that `renderGuideBody`'s three layout branches and the
 * `/dojo/guides` hub top page do not duplicate the same Divider + Breadcrumb
 * pair — only the breadcrumb items differ between call sites.
 *
 * The pair is wrapped in `!mt-4 space-y-4` to match `PageLayout`'s
 * trailing-block spacing (see PageLayout.tsx).
 */
export function GuidePageFooter({ items, locale }: GuidePageFooterProps) {
  return (
    <div className="!mt-4 space-y-4">
      <Divider />
      <Breadcrumb items={items} locale={locale} density="compact" />
    </div>
  );
}
