'use client';

import { useState } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { MEMBER_JOINED_RETENTION_DAYS } from '@/lib/feed-items/member-joined';
import type { SocialAuthorProfile } from '@/lib/users/author-profile';

import { MemberJoinedCardPreview } from '@/app/[locale]/(public)/(home)/_components/MemberJoinedCard';

import { decideJoinAnnouncement } from '../_actions/decideJoinAnnouncement';
import { StepHeading } from './StepHeading';

/** What the member answered on this step, once answered in this session. */
export type JoinAnnouncementAnswer = 'posted' | 'declined';

type Props = {
  locale: string;
  /** The card's subject — the member, with the avatar/country just set on step 1. */
  member: SocialAuthorProfile;
  /** Set once answered; the step then shows the outcome instead of the question. */
  answer: JoinAnnouncementAnswer | null;
  onAnswered: (answer: JoinAnnouncementAnswer) => void;
  /** Advance to the next step (after answering, or when revisiting an answered step). */
  onNext: () => void;
};

/**
 * Step 2 — offer to announce the new member on the home feed. Shows the exact
 * card that would be posted, says how long it stays and how to delete it, and
 * leaves the choice to two buttons: there is no default.
 *
 * The answer is final (one-shot — see `join_announcement_decisions`),
 * so going back to this step shows what was chosen rather than asking again.
 */
export function JoinAnnouncementStep({ locale, member, answer, onAnswered, onNext }: Props) {
  const t = useTranslations('onboardingWizard.joinAnnouncement');
  const tSquares = useTranslations('topics.squares');
  const [pending, setPending] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (announce: boolean) => {
    setPending(announce);
    setError(null);
    const result = await decideJoinAnnouncement({ announce });
    setPending(null);
    if ('error' in result) {
      setError(t('error'));
      return;
    }
    // Show what is on record, not the button that was pressed: a second tab
    // or an earlier visit may have answered first, and the other way.
    onAnswered(result.outcome === 'announced' ? 'posted' : 'declined');
    onNext();
  };

  const isBusy = pending !== null;

  return (
    <div className="space-y-6">
      <StepHeading>{t('title')}</StepHeading>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t('previewLabel')}</p>
        <MemberJoinedCardPreview
          member={member}
          locale={locale}
          justNowLabel={tSquares('justNow')}
        />
      </div>

      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>{t('retentionNote', { days: MEMBER_JOINED_RETENTION_DAYS })}</li>
        <li>{t('deleteNote')}</li>
      </ul>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {answer ? (
        <div className="space-y-4">
          <p className="text-center text-sm text-foreground">
            {answer === 'posted' ? t('postedMessage') : t('declinedMessage')}
          </p>
          <Button type="button" variant="primary" size="lg" fullWidth onClick={onNext}>
            {t('next')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => decide(true)}
            loading={pending === true}
            disabled={isBusy}
          >
            {t('post')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => decide(false)}
            loading={pending === false}
            disabled={isBusy}
          >
            {t('decline')}
          </Button>
        </div>
      )}
    </div>
  );
}
