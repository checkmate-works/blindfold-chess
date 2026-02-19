import { Breadcrumb, Divider, PageTitle } from '@/app/[locale]/_components';
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
 * Shared layout wrapper for all practice session pages.
 *
 * Renders the standard structure:
 *   <PageTitle> ... </PageTitle>
 *   {children}
 *   <Divider />
 *   <Breadcrumb />
 */
export function PracticeSessionPage({
  locale,
  title,
  breadcrumbItems,
  children,
  showDivider = true,
  containerClassName = 'space-y-8',
  dividerClassName,
}: Props) {
  return (
    <div className={containerClassName}>
      <PageTitle>{title}</PageTitle>

      {children}

      {showDivider && <Divider className={dividerClassName} />}

      <Breadcrumb items={breadcrumbItems} locale={locale} />
    </div>
  );
}
