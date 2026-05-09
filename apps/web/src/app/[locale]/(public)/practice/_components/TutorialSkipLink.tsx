'use client';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { TUTORIAL_SKIP_CONFIG, type TutorialSkipModuleId } from '../_lib/tutorial-skip-config';

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

/**
 * Module-driven skip link. Pulls storage key, redirect path, and translation
 * config from `TUTORIAL_SKIP_CONFIG` so call sites only need to pass the
 * module id and the user's locale. Replaces the per-module wrapper components.
 */
export function ModuleTutorialSkipLink({
  locale,
  moduleId,
}: {
  locale: Locale;
  moduleId: TutorialSkipModuleId;
}) {
  const config = TUTORIAL_SKIP_CONFIG[moduleId];
  return (
    <TutorialSkipLink
      locale={locale}
      storageKey={config.storageKey}
      redirectPath={config.redirectPath}
      translationNamespace={config.translationNamespace}
      translationKey={config.translationKey}
    />
  );
}

function TutorialSkipLink(props: Props) {
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
