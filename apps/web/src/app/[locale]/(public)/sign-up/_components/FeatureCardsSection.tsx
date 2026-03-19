import type { getTranslations } from 'next-intl/server';

import { FaChartLine, FaTrophy, FaUser, FaUsers } from 'react-icons/fa';

import { FeatureCard } from './FeatureCard';

type Props = {
  t: Awaited<ReturnType<typeof getTranslations<'signUp'>>>;
};

export function FeatureCardsSection({ t }: Props) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-base font-bold text-foreground">{t('features.sectionTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('features.sectionSubtitle')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FeatureCard
          icon={<FaUsers />}
          iconColor="blue"
          title={t('features.social.title')}
          description={t('features.social.description')}
        />
        <FeatureCard
          icon={<FaTrophy />}
          iconColor="orange"
          title={t('features.leaderboard.title')}
          description={t('features.leaderboard.description')}
        />
        <FeatureCard
          icon={<FaChartLine />}
          iconColor="green"
          title={t('features.tracking.title')}
          description={t('features.tracking.description')}
        />
        <FeatureCard
          icon={<FaUser />}
          iconColor="purple"
          title={t('features.profile.title')}
          description={t('features.profile.description')}
        />
      </div>
    </div>
  );
}
