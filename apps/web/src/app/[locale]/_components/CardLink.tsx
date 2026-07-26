// Note: Using standard next/link with an explicit locale-prefixed href instead
// of the @/i18n/routing Link, to avoid DYNAMIC_SERVER_USAGE errors that flip
// statically-generated Server Component pages to dynamic in production (does not
// surface in `next dev`). This matches the convention in Breadcrumb / IconTileCard
// / the glossary components. Routing uses `localePrefix: 'always'` with no
// localized `pathnames`, so `/${locale}${href}` is equivalent to what the
// next-intl Link would emit.
import Link from 'next/link';

type Props = {
  /** Locale-less path (e.g. `/learn/...`); the locale prefix is added here. */
  href: string;
  icon: string;
  title: string;
  description: string;
  locale?: string;
  className?: string;
};

export function CardLink({ href, icon, title, description, locale, className }: Props) {
  return (
    <Link
      href={locale ? `/${locale}${href}` : href}
      className={`group block p-4 bg-card rounded-md border border-border transition-all hover:border-foreground/20 ${className || ''}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <div className="flex-1">
          <h3 className="text-base font-medium text-foreground mb-1 transition-colors">{title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
        </div>
      </div>
    </Link>
  );
}
