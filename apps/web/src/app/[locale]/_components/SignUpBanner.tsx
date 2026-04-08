import { getOptionalUser } from '@/lib/auth';

import { SignUpBannerUI } from './SignUpBannerUI';

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
    <SignUpBannerUI
      locale={locale}
      message={message}
      description={description}
      ctaLabel={ctaLabel}
    />
  );
}
