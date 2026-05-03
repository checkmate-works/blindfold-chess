// Note: Using standard next/link instead of @/i18n/routing Link
// to avoid DYNAMIC_SERVER_USAGE errors in production.
// Server Components should use standard Link with explicit locale in href.
import Image from 'next/image';
import Link from 'next/link';

import { JsonLd, generateBreadcrumbListSchema } from '@/lib/seo/jsonld';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Density = 'default' | 'compact';

type BreadcrumbContentProps = {
  items: BreadcrumbItem[];
  locale?: string;
  brandName: string;
  /**
   * `'default'` reserves a 40px tall band (CLS-safe for 2-line wraps on narrow
   * viewports — e.g. es `/games/play/postmortem`) and adds a 16px bottom margin.
   * `'compact'` halves that visible spacing for use inside `PageLayout`, where the
   * panel's `space-y-*` flow plus its bottom padding already supply most of the
   * surrounding gap. Use `'default'` for standalone breadcrumbs that are not
   * wrapped by `PageLayout`.
   */
  density?: Density;
};

export function BreadcrumbContent({
  items,
  locale,
  brandName,
  density = 'default',
}: BreadcrumbContentProps) {
  const effectiveLocale = locale || 'en';
  const navClass =
    density === 'compact' ? 'flex min-h-6 items-center' : 'mb-4 flex min-h-10 items-center';

  return (
    <>
      <JsonLd data={generateBreadcrumbListSchema(items, effectiveLocale, brandName)} />
      <nav aria-label="Breadcrumb" className={navClass}>
        <ol className="flex flex-wrap items-center gap-x-1 text-sm">
          <li>
            <Link
              href={locale ? `/${locale}` : '/'}
              className="flex items-center hover:opacity-70 transition-opacity"
            >
              <Image
                src="/logo.png"
                alt={brandName}
                width={24}
                height={24}
                className="rounded-sm"
              />
            </Link>
          </li>

          {items.map((item, index) => (
            <li key={index} className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              {item.href ? (
                <Link
                  href={locale ? `/${locale}${item.href}` : item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  locale?: string;
  density?: Density;
};

export function Breadcrumb({ items, locale, density }: BreadcrumbProps) {
  return <BreadcrumbContent items={items} locale={locale} brandName="Home" density={density} />;
}
