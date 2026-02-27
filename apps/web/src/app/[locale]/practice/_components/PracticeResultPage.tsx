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
  /** Optional className override for the outer container div. Defaults to "container py-8 max-w-4xl mx-auto space-y-8". */
  containerClassName?: string;
  /** Optional className for the Divider. */
  dividerClassName?: string;
};

/**
 * Shared layout wrapper for all practice result pages.
 *
 * Renders the standard structure:
 *   <PageTitle> ... </PageTitle>
 *   {children}
 *   <Divider />
 *   <Breadcrumb />
 */
export function PracticeResultPage({
  locale,
  title,
  breadcrumbItems,
  children,
  containerClassName = 'container py-8 max-w-4xl mx-auto space-y-8',
  dividerClassName,
}: Props) {
  return (
    <div className={containerClassName}>
      <PageTitle>{title}</PageTitle>

      {children}

      <Divider className={dividerClassName} />

      <Breadcrumb items={breadcrumbItems} locale={locale} />
    </div>
  );
}
