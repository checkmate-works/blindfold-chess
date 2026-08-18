// Note: Using standard next/link instead of @/i18n/routing Link
// to avoid DYNAMIC_SERVER_USAGE errors in production.
// Server Components should use standard Link with explicit locale in href.
import Image from 'next/image';
import Link from 'next/link';

import { JsonLd, generateBreadcrumbListSchema } from '@/lib/seo/jsonld';

import { Skeleton } from './Skeleton';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Density = 'default' | 'compact';

type BreadcrumbContentProps = {
  items: BreadcrumbItem[];
  /**
   * Required: `item.href` values are locale-less (e.g. `/games`) and the prefix
   * is added here, so an omitted `locale` would emit a locale-less link. The
   * app has no locale-completion fallback for those — `[locale]` would bind to
   * the first path segment and `dynamicParams = false` in `[locale]/layout.tsx`
   * would 404. Shipped that way once via `CardLink`; see its TSDoc.
   */
  locale: string;
  brandName: string;
  /**
   * `'default'` reserves a 40px tall band (CLS-safe for 2-line wraps on narrow
   * viewports — e.g. es `/games/play/recall`) and adds a 16px bottom margin.
   * `'compact'` halves that visible spacing for use inside `PageLayout`, where the
   * panel's `space-y-*` flow plus its bottom padding already supply most of the
   * surrounding gap. Use `'default'` for standalone breadcrumbs that are not
   * wrapped by `PageLayout`.
   */
  density?: Density;
};

function breadcrumbNavClass(density: Density): string {
  return density === 'compact' ? 'flex min-h-6 items-center' : 'mb-4 flex min-h-10 items-center';
}

export function BreadcrumbContent({
  items,
  locale,
  brandName,
  density = 'default',
}: BreadcrumbContentProps) {
  const navClass = breadcrumbNavClass(density);

  return (
    <>
      <JsonLd data={generateBreadcrumbListSchema(items, locale, brandName)} />
      <nav aria-label="Breadcrumb" className={navClass}>
        <ol className="flex flex-wrap items-center gap-x-1 text-sm">
          <li>
            <Link
              href={`/${locale}`}
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
                  href={`/${locale}${item.href}`}
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
  /** See `BreadcrumbContentProps.locale` — required for the same reason. */
  locale: string;
  density?: Density;
};

export function Breadcrumb({ items, locale, density }: BreadcrumbProps) {
  return <BreadcrumbContent items={items} locale={locale} brandName="Home" density={density} />;
}

/**
 * One placeholder crumb: either a label the skeleton already knows (a static
 * section name) or a bar standing in for one it cannot know yet (a title still
 * being fetched). `current` marks the crumb the real breadcrumb will render
 * without a link — the last one.
 */
export type BreadcrumbSkeletonCrumb = { label: string; current?: boolean } | { widthClass: string };

type BreadcrumbSkeletonProps = {
  crumbs: BreadcrumbSkeletonCrumb[];
  density?: Density;
};

/**
 * The loading placeholder for {@link Breadcrumb}, sharing its nav class so the
 * two cannot disagree about the band they occupy.
 *
 * Thirteen `loading.tsx` / skeleton files wrote this markup out by hand, and
 * nine of them ended up with `items-end` against the real breadcrumb's
 * `items-center` — a vertical offset in the one component whose entire job is
 * to reserve the same space the real thing will take.
 */
export function BreadcrumbSkeleton({ crumbs, density = 'default' }: BreadcrumbSkeletonProps) {
  return (
    <nav aria-label="Breadcrumb" className={breadcrumbNavClass(density)}>
      <ol className="flex flex-wrap items-center gap-x-1 text-sm">
        <li>
          <Skeleton className="size-6 rounded-sm" />
        </li>
        {crumbs.map((crumb, index) => (
          <li key={index} className="flex items-center">
            <span className="mx-1 text-muted-foreground">/</span>
            {'label' in crumb ? (
              <span
                className={crumb.current ? 'text-foreground font-medium' : 'text-muted-foreground'}
              >
                {crumb.label}
              </span>
            ) : (
              <Skeleton className={`h-4 rounded ${crumb.widthClass}`} />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
