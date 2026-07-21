import { getTranslations } from 'next-intl/server';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';

import { RankCard } from '@/app/[locale]/(public)/dojo/ranks/_components/RankCard';
import { buildRankTeaserCards } from '@/app/[locale]/(public)/dojo/ranks/_lib/helpers';

type Props = {
  locale: string;
};

/**
 * Onboarding final step — reuses the getting-started "黒帯を目指して鍛錬しよう"
 * belt-ranks teaser (gettingStarted.ranks heading + RankCard teaser cards),
 * restyled to match the onboarding slide headings. Server-rendered and passed
 * into the client `OnboardingWizard` as the last slide. It carries its own exit
 * links — すべての段級位を見る → /ranks and AIと対局する → /games/new — so the
 * wizard's shared next/back nav is hidden here.
 */
export async function BeltRanksSlide({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'gettingStarted' });
  const tRanks = await getTranslations({ locale, namespace: 'ranks' });
  const tw = await getTranslations({ locale, namespace: 'onboardingWizard' });

  const teaserCards = buildRankTeaserCards(locale, tRanks).map((props) => (
    <RankCard key={props.slug} {...props} />
  ));

  return (
    <section className="space-y-6">
      <div className="space-y-1 text-center">
        <p className="font-medium text-foreground">{t('ranks.title')}</p>
        <p className="text-sm text-muted-foreground">{tw('belt.description')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{teaserCards}</div>

      <div className="text-center">
        <Link href="/dojo/ranks">
          <Button asChild variant="primary" size="lg">
            {t('ranks.viewAll')}
          </Button>
        </Link>
        <Link
          href="/games/new"
          className="mt-6 block text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {tw('belt.playCta')}
        </Link>
      </div>
    </section>
  );
}
