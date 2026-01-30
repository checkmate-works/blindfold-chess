import { Link } from '@/i18n/routing';

type Props = {
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
      href={href}
      locale={locale}
      className={`group block p-6 bg-card rounded-md shadow-sm border border-border transition-all hover:shadow-md hover:border-foreground/20 ${className || ''}`}
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl flex-shrink-0">{icon}</span>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-foreground mb-2 transition-colors">{title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
        </div>
      </div>
    </Link>
  );
}
