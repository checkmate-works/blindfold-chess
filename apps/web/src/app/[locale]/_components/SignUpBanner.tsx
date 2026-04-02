import { Link } from '@/i18n/routing';

import { getOptionalUser } from '@/lib/auth';

type Props = {
  locale: string;
  message: string;
  description: string;
  ctaLabel: string;
};

export async function SignUpBanner({ locale, message, description, ctaLabel }: Props) {
  const user = await getOptionalUser();
  if (user) return null;

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 sm:p-6">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div>
          <p className="font-medium text-foreground">{message}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Link
          href="/sign-up"
          locale={locale}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
