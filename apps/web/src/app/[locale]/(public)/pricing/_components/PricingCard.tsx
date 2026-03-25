'use client';

import { useRouter } from 'next/navigation';

import { FiCheck } from 'react-icons/fi';

import { createCheckoutSession } from '@/app/[locale]/(protected)/mypage/(confirmed)/subscription/_actions/createCheckoutSession';

type Props = {
  name: string;
  price: string;
  priceUnit?: string;
  features: string[];
  isCurrent: boolean;
  currentLabel: string;
  ctaLabel?: string;
  ctaHref?: string;
  locale?: string;
  isAuthenticated?: boolean;
};

export function PricingCard({
  name,
  price,
  priceUnit,
  features,
  isCurrent,
  currentLabel,
  ctaLabel,
  ctaHref,
  locale,
  isAuthenticated,
}: Props) {
  const router = useRouter();

  async function handleSubscribe() {
    if (!isAuthenticated) {
      router.push(`/${locale}/sign-in?returnTo=/${locale}/pricing`);
      return;
    }
    if (locale) {
      const result = await createCheckoutSession(locale);
      if (result && 'error' in result) {
        // Handle error (rate limit, etc.)
        console.error('Checkout error:', result.error);
      }
      // If successful, redirect happens via Server Action
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold">{name}</h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold">{price}</span>
        {priceUnit && <span className="text-muted-foreground">{priceUnit}</span>}
      </div>

      {isCurrent && (
        <span className="mt-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {currentLabel}
        </span>
      )}

      <ul className="mt-6 space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm text-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {ctaLabel &&
        !isCurrent &&
        (ctaHref ? (
          <a
            href={ctaHref}
            className="mt-6 block w-full rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {ctaLabel}
          </a>
        ) : (
          <button
            onClick={handleSubscribe}
            className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {ctaLabel}
          </button>
        ))}
    </div>
  );
}
