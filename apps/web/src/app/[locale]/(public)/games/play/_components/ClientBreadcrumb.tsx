'use client';

import { BreadcrumbContent } from '@/app/[locale]/_components/Breadcrumb';

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  items: BreadcrumbItem[];
  locale?: string;
  brandName: string;
};

/**
 * Client-side wrapper for Breadcrumb component.
 * Use this in dynamic client components where searchParams or other client-side data is used.
 * For static server components, use the base Breadcrumb component directly.
 */
export function ClientBreadcrumb({ items, locale, brandName }: Props) {
  return <BreadcrumbContent items={items} locale={locale} brandName={brandName} />;
}
