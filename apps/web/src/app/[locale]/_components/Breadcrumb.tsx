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

type BreadcrumbContentProps = {
  items: BreadcrumbItem[];
  locale?: string;
  brandName: string;
  /**
   * Optional per-request CSP nonce. Server Component callers resolve this
   * via `resolveCspNonce()` (`@/lib/security/nonce`) and pass it through so
   * the emitted `<script type="application/ld+json">` passes the enforcing
   * `script-src` policy. Client-reachable callers omit it; the script then
   * renders without a nonce and may be blocked by strict CSP in the
   * browser, but Google's crawler still parses the JSON-LD from the HTML
   * source, so rich-result eligibility is preserved.
   */
  nonce?: string;
};

export function BreadcrumbContent({ items, locale, brandName, nonce }: BreadcrumbContentProps) {
  const effectiveLocale = locale || 'en';

  return (
    <>
      <JsonLd
        data={generateBreadcrumbListSchema(items, effectiveLocale, brandName)}
        nonce={nonce}
      />
      {/*
        Reserve 2-line height (text-sm line-height 20px x 2 = 40px) so that
        long i18n labels (e.g. es `/games/play/postmortem` with
        "Partidas / Resultado de la Partida / Revisión de Partida") do not
        trigger CLS when they wrap on narrow viewports. The single-line
        case simply leaves bottom whitespace inside the reserved block; the
        `items-end` alignment keeps the label anchored to the bottom so the
        visual rhythm with the following `mb-4` block is preserved.
      */}
      <nav aria-label="Breadcrumb" className="mb-4 flex min-h-10 items-end">
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
  /** See `BreadcrumbContentProps.nonce`. */
  nonce?: string;
};

export function Breadcrumb({ items, locale, nonce }: BreadcrumbProps) {
  return <BreadcrumbContent items={items} locale={locale} brandName="Home" nonce={nonce} />;
}
