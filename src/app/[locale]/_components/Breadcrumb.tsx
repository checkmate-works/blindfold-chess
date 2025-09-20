import { Link } from '@/i18n/routing';
import Image from 'next/image';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  locale?: string;
}

export function Breadcrumb({ items, locale }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center space-x-1 text-sm">
        <li>
          <Link
            href="/"
            locale={locale}
            className="flex items-center hover:opacity-70 transition-opacity"
          >
            <Image
              src="/logo.png"
              alt="Blindfold Chess"
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
                href={item.href}
                locale={locale}
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
  );
}
