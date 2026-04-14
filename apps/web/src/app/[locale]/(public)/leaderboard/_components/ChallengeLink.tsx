import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import {
  type LeaderboardModule,
  buildChallengePath,
} from '@/app/[locale]/(public)/leaderboard/_lib/types';

type Props = {
  locale: string;
  module: LeaderboardModule;
  settingKey: string;
};

export async function ChallengeLink({ locale, module, settingKey }: Props) {
  const t = await getTranslations({ locale, namespace: 'leaderboard' });
  const challengePath = buildChallengePath(module, settingKey);

  return (
    <div className="pt-4">
      <Link
        href={challengePath}
        locale={locale}
        className="flex w-full items-center justify-center whitespace-nowrap rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {t('tryChallenge')}
      </Link>
    </div>
  );
}
