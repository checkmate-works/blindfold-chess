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
  /** Whether to show the Divider between children and Breadcrumb. Defaults to true. */
  showDivider?: boolean;
  /** Optional className override for the outer container div. Defaults to "space-y-8". */
  containerClassName?: string;
  /** Optional className for the Divider. */
  dividerClassName?: string;
};

/**
 * Shared layout wrapper for all practice session pages. Delegates to
 * `PageLayout`.
 */
export function PracticeSessionPage({
  locale,
  title,
  breadcrumbItems,
  children,
  showDivider = true,
  containerClassName,
  dividerClassName,
}: Props) {
  return (
    <PageLayout
      title={title}
      locale={locale}
      breadcrumb={breadcrumbItems}
      divider={showDivider}
      dividerClassName={dividerClassName}
      className={containerClassName}
    >
      {children}
    </PageLayout>
  );
}
