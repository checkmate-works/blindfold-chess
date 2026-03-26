'use client';

import { useRouter } from 'next/navigation';

import { FiCheck } from 'react-icons/fi';

import { createCheckoutSession } from '@/app/[locale]/(protected)/mypage/(confirmed)/subscription/_actions/createCheckoutSession';

type BaseProps = {
  name: string;
  price: string;
  priceUnit?: string;
  features: string[];
  isCurrent: boolean;
  currentLabel: string;
};

type FreePlanProps = BaseProps & {
  variant: 'free';
};

type PaidPlanProps = BaseProps & {
  variant: 'paid';
  ctaLabel: string;
  locale: string;
  isAuthenticated: boolean;
  ctaHref?: string;
};

type Props = FreePlanProps | PaidPlanProps;

export function PricingCard(props: Props) {
  const { name, price, priceUnit, features, isCurrent, currentLabel } = props;
  const router = useRouter();

  async function handleSubscribe() {
    if (props.variant !== 'paid') return;
    if (!props.isAuthenticated) {
      router.push(`/${props.locale}/sign-in?returnTo=/${props.locale}/pricing`);
      return;
    }
    const result = await createCheckoutSession(props.locale);
    if (result && 'error' in result) {
      // Handle error (rate limit, etc.)
      console.error('Checkout error:', result.error);
    }
    // If successful, redirect happens via Server Action
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

      {props.variant === 'paid' &&
        props.ctaLabel &&
        !isCurrent &&
        (props.ctaHref ? (
          <a
            href={props.ctaHref}
            className="mt-6 block w-full rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {props.ctaLabel}
          </a>
        ) : (
          <button
            onClick={handleSubscribe}
            className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {props.ctaLabel}
          </button>
        ))}
    </div>
  );
}
