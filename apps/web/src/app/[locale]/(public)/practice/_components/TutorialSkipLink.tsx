'use client';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

type RedirectProps = {
  locale: Locale;
  storageKey: string;
  redirectPath: string;
  translationNamespace: string;
  translationKey?: string;
};

type CallbackProps = {
  onClick: () => void;
  translationNamespace: string;
  translationKey: string;
};

type Props = RedirectProps | CallbackProps;

function isRedirectProps(props: Props): props is RedirectProps {
  return 'locale' in props;
}

export function TutorialSkipLink(props: Props) {
  const t = useTranslations(props.translationNamespace);
  const router = useRouter();

  const handleClick = () => {
    if (isRedirectProps(props)) {
      localStorage.setItem(props.storageKey, 'true');
      router.push(`/${props.locale}/practice/${props.redirectPath}`);
    } else {
      props.onClick();
    }
  };

  const label = t(
    isRedirectProps(props) ? (props.translationKey ?? 'tutorial.skip') : props.translationKey
  );

  return (
    <button onClick={handleClick} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
      {label}
    </button>
  );
}
