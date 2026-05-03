import { PageLayout } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  /** The locale for the current page. */
  locale: Locale;
  /** The page title displayed in the PageTitle component. */
  title: string;
  /** Breadcrumb items. */
  breadcrumbItems: BreadcrumbItem[];
  /** The main content rendered between PageTitle and Divider. */
  children: React.ReactNode;
  /** Optional className override for the outer container div. Defaults to "space-y-8". */
  containerClassName?: string;
  /** Optional className for the trailing Divider. */
  dividerClassName?: string;
};

/**
 * Shared layout wrapper for all practice result pages. Delegates to `PageLayout`
 * so spacing rules (panel padding, breadcrumb gap) stay aligned with the rest
 * of the app.
 */
export function PracticeResultPage({
  locale,
  title,
  breadcrumbItems,
  children,
  containerClassName,
  dividerClassName,
}: Props) {
  return (
    <PageLayout
      title={title}
      locale={locale}
      breadcrumb={breadcrumbItems}
      className={containerClassName}
      dividerClassName={dividerClassName}
    >
      {children}
    </PageLayout>
  );
}
