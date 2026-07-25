import { getTranslations } from 'next-intl/server';

import { Button } from '@/app/_components/Button';
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

  // Layout-agnostic: the caller decides spacing/placement. `block` keeps the
  // anchor in normal block flow (so a sibling's top margin measures from the
  // button's bottom, not an inline box) and lets the inner `w-full` button fill
  // the caller's container.
  return (
    <Link href={challengePath} locale={locale} className="block">
      <Button asChild variant="primary" size="lg" className="w-full whitespace-nowrap">
        {t('tryChallenge')}
      </Button>
    </Link>
  );
}
