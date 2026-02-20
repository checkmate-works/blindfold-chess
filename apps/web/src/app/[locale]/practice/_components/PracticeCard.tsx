import Image from 'next/image';

import { Link } from '@/i18n/routing';

type Props = {
  href: string;
  icon: string;
  title: string;
  description: string;
  locale?: string;
  thumbnail?: string;
  className?: string;
};

export function PracticeCard({
  href,
  icon,
  title,
  description,
  locale,
  thumbnail,
  className,
}: Props) {
  return (
    <Link
      href={href}
      locale={locale}
      className={`group block bg-card rounded-md shadow-sm border border-border transition-all hover:shadow-md hover:border-foreground/20 overflow-hidden ${className || ''}`}
    >
      <div className="flex items-center gap-3 px-6 pt-5 pb-3">
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <h3 className="text-lg font-medium text-foreground transition-colors">{title}</h3>
      </div>
      <div className="px-6 pb-3">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            width={400}
            height={400}
            className="w-full h-auto rounded-sm"
          />
        ) : (
          <div className="flex items-center justify-center aspect-square rounded-sm bg-muted">
            <span className="text-sm text-muted-foreground">No Image</span>
          </div>
        )}
      </div>
      <div className="px-6 pb-5">
        <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
      </div>
    </Link>
  );
}
