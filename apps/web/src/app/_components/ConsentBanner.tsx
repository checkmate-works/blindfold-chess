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
 * ## Why this banner is ours
 *
 * It replaces Google's "Privacy & messaging" (formerly Funding Choices),
 * which used to deliver the consent message here. That message is a feature
 * of an AdSense *account*, not a standalone product: for a plain AdSense
 * publisher there is no separate tag to install, and the message rides on the
 * `adsbygoogle.js` loader. So it lasts exactly as long as the account does —
 * and an AdSense account with six months of zero ad impressions is suspended
 * (a site goes "inactive" after four). Once the ad units went, keeping the
 * loader on the page was a countdown, not a steady state: when the account
 * lapsed, the consent banner would have vanished with it, silently, on a site
 * still running GA4.
 *
 * A hosted CMP was the other option and was tried. CookieYes's free tier is
 * exhausted almost immediately at this site's traffic, and because it loads
 * asynchronously and then inserts itself into the document flow, it shifted
 * the page under the reader on nearly every visit. Both problems are
 * structural to buying this rather than building it.
 *
 * Building it is small because the scope is small. An IAB TCF-certified CMP
 * is a requirement for serving programmatic ads, not for running analytics;
 * with AdSense gone and GA4 the only tag left, "do not load the script until
 * the visitor agrees" is the entire obligation, and there is no requirement
 * to keep a server-side record of the decision. What remains is a cookie, an
 * attribute, and two buttons.
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
