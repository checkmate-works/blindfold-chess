import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';
import { Link } from '@/i18n/routing';

export default async function NotFound() {
  const locale = await getLocaleFromPathnameHeader();
  return (
    <div className="flex items-center justify-center min-h-[60vh] -my-8">
      <div className="text-center px-4">
        <h1 className="text-6xl font-light text-foreground mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-8">Page not found</p>
        <Link
          href="/"
          locale={locale}
          className="inline-block px-6 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
