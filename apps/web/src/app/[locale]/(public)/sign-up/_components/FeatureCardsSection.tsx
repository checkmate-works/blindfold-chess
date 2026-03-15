import type { getTranslations } from 'next-intl/server';

import { FaTrophy, FaUsers } from 'react-icons/fa';

import { FeatureCard } from './FeatureCard';

type Props = {
  t: Awaited<ReturnType<typeof getTranslations<'signUp'>>>;
};

export function FeatureCardsSection({ t }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground text-center">
        {t('features.sectionTitle')}
        <br />
        {t('features.sectionSubtitle')}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FeatureCard
          icon={<FaUsers />}
          iconColor="blue"
          title={t('features.social.title')}
          description={t('features.social.description')}
          badgeLabel={t('features.social.badge')}
          badgeVariant="comingSoon"
        />
        <FeatureCard
          icon={<FaTrophy />}
          iconColor="orange"
          title={t('features.leaderboard.title')}
          description={t('features.leaderboard.description')}
          badgeLabel={t('features.leaderboard.badge')}
          badgeVariant="planning"
        />
      </div>
    </div>
  );
}
