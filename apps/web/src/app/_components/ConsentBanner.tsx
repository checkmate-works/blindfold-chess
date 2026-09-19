import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { ConsentBannerClient } from '@/app/_components/ConsentBannerClient';

import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';

type Props = {
  locale: string;
};

/**
 * The GDPR / ePrivacy consent banner, mounted in every root layout.
 *
 * Google Analytics is the only thing consent gates here, and it does not load
 * until the visitor says yes — see `GoogleScripts`. That is the whole
 * arrangement: no consent signal forwarded to a vendor, no server-side record
 * of the decision, no per-region variation. The banner shows for everyone,
 * because showing it only in the EEA would mean a geo lookup on a request
 * whose page is otherwise static.
 *
 * A Server Component, so the copy is translated per locale without adding a
 * namespace to the client dictionary every page ships; `ConsentBannerClient`
 * below it carries only the click handlers and the storage gate.
 */
export async function ConsentBanner({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'consent' });

  return (
    <ConsentBannerClient
      regionLabel={t('regionLabel')}
      acceptLabel={t('accept')}
      denyLabel={t('deny')}
    >
      {t.rich('message', {
        privacyLink: (chunks) => (
          <Link href={`/${locale}/privacy`} prefetch={false} className={TEXT_LINK_MUTED_CLASSES}>
            {chunks}
          </Link>
        ),
      })}
    </ConsentBannerClient>
  );
}
