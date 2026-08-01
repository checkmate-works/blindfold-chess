'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button, FormErrorBanner } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from '@/lib/games/publish-constants';
import { getSharedGameByPublishedId } from '@/lib/games/shared-game-store';

import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { updateSharedGameAction } from '../../_actions/manage-shared-game';

type Props = {
  gameId: string;
  initialTitle: string;
  initialDescription: string;
  /** Whether the signed-in viewer owns this game via author_id. */
  isRegisteredOwner: boolean;
  locale: Locale;
};

type Ownership = 'checking' | 'owner' | 'denied';

/**
 * Edit form for a shared game's title / description, on a dedicated page
 * (consistent with the publish page). Ownership is re-checked: registered
 * authors are trusted from the server; account-less authors must hold this
 * browser's manage token. The action re-authorizes server-side regardless.
 */
export function EditGameClient({
  gameId,
  initialTitle,
  initialDescription,
  isRegisteredOwner,
  locale,
}: Props) {
  const t = useTranslations('sharedGames');
  const router = useRouter();

  const [ownership, setOwnership] = useState<Ownership>(isRegisteredOwner ? 'owner' : 'checking');
  const [token, setToken] = useState<string | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isRegisteredOwner) return;
    const found = getSharedGameByPublishedId(gameId);
    if (found?.record.manageToken) {
      setToken(found.record.manageToken);
      setOwnership('owner');
    } else {
      setOwnership('denied');
    }
  }, [gameId, isRegisteredOwner]);

  if (ownership === 'checking') {
    return <p className="py-8 text-center text-muted-foreground">{t('new.loading')}</p>;
  }
  if (ownership === 'denied') {
    return (
      <div className="space-y-3 py-8 text-center">
        <p className="text-muted-foreground">{t('edit.notAuthorized')}</p>
        <Link
          href={`/${locale}/games/shared/${gameId}`}
          className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}
        >
          {t('edit.backToGame')}
        </Link>
      </div>
    );
  }

  const trimmedTitle = title.trim();
  const canSubmit =
    trimmedTitle.length > 0 && trimmedTitle.length <= MAX_TITLE_LENGTH && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await updateSharedGameAction({
      gameId,
      title: trimmedTitle,
      description: description.trim() || null,
      token: token ?? undefined,
    });
    if (!res.success) {
      setSubmitting(false);
      setError(
        res.error === 'forbidden' ? t('detail.errors.forbidden') : t('detail.errors.generic')
      );
      return;
    }
    router.push(`/${locale}/games/shared/${gameId}`);
  }

  return (
    <div className="space-y-6">
      <SectionTitle>{t('new.sectionTitle')}</SectionTitle>

      <div className="space-y-1.5">
        <label htmlFor="edit-game-title" className="block text-sm font-medium">
          {t('new.titleLabel')}
        </label>
        <input
          id="edit-game-title"
          type="text"
          value={title}
          maxLength={MAX_TITLE_LENGTH}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('new.titlePlaceholder')}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="edit-game-description" className="block text-sm font-medium">
          {t('new.descriptionLabel')}
        </label>
        <textarea
          id="edit-game-description"
          value={description}
          maxLength={MAX_DESCRIPTION_LENGTH}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('new.descriptionPlaceholder')}
          rows={4}
          className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Both verdicts here (not yours to edit / unexpected failure) belong
          to the form, not to the title or description box. */}
      <FormErrorBanner message={error} />

      <Button
        variant="primary"
        size="lg"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="w-full rounded-xl font-medium"
      >
        {submitting ? t('edit.submitting') : t('edit.submit')}
      </Button>
    </div>
  );
}
