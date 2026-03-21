import Link from 'next/link';

type Props = {
  locale: string;
  href: string;
  label: string;
  icon: string;
};

export function ChallengeCard({ locale, href, label, icon }: Props) {
  return (
    <Link
      href={`/${locale}${href}`}
      className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all group gap-1"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors text-2xl">
        {icon}
      </div>
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
        {label}
      </span>
    </Link>
  );
}
