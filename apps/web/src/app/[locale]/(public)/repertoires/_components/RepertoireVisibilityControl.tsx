'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';

import { localizeActionErrorOrGeneric } from '@/lib/i18n/localize-action-error';
// Pure catalog leaf (not the '@/lib/points' barrel) — client-safe, no server-only.
import type { RepertoireVisibility } from '@/lib/points/spend-catalog';
import { REPERTOIRE_VISIBILITIES, repertoireVisibilityCharge } from '@/lib/points/spend-catalog';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { changeVisibility } from '../[id]/_actions/changeVisibility';

/** RepertoireVisibility (snake) → its `Repertoires.visibility.*` i18n key (camel). */
const VISIBILITY_I18N_KEY: Record<RepertoireVisibility, string> = {
  public: 'public',
  followers_only: 'followersOnly',
  private: 'private',
};

type Props = {
  id: string;
  locale: string;
  /** The repertoire's current visibility tier. */
  current: RepertoireVisibility;
  /** Coins already spent on this repertoire's visibility (its highest tier reached). */
  visibilityPaid: number;
  /** The owner's spendable coin balance. */
  spendableBalance: number;
};

/**
 * Owner-only control to change a Kata's visibility tier. Opens a modal listing
 * the three tiers, each labelled with its INCREMENTAL coin cost given what the
 * owner has already paid on this course (`repertoireVisibilityCharge`), so a
 * tier already unlocked reads "Free". Confirming calls the `changeVisibility`
 * action; the server is the source of truth for the charge (this only previews
 * it). On success the page refreshes so the status chip updates.
 */
export function RepertoireVisibilityControl({
  id,
  locale,
  current,
  visibilityPaid,
  spendableBalance,
}: Props) {
  const t = useTranslations('Repertoires');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<RepertoireVisibility>(current);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cost = repertoireVisibilityCharge(target, visibilityPaid);
  const changed = target !== current;

  function openModal() {
    setTarget(current);
    setError(null);
    setOpen(true);
  }

  async function apply() {
    if (!changed) {
      setOpen(false);
      return;
    }
    setPending(true);
    setError(null);
    const result = await changeVisibility({ id, target, locale });
    if ('error' in result) {
      setPending(false);
      setError(localizeActionErrorOrGeneric(result.error, t));
      return;
    }
    setPending(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted-foreground/20 hover:text-foreground"
      >
        {t('visibility.change')}
      </button>
      <ConfirmationModal
        isOpen={open}
        title={t('visibility.changeTitle')}
        error={error}
        confirmText={t('visibility.changeConfirm')}
        cancelText={t('visibility.cancel')}
        isLoading={pending}
        onConfirm={() => void apply()}
        onCancel={() => setOpen(false)}
      >
        <div className="mt-2 space-y-2">
          {REPERTOIRE_VISIBILITIES.map((value) => {
            const inc = repertoireVisibilityCharge(value, visibilityPaid);
            const key = VISIBILITY_I18N_KEY[value];
            return (
              <label key={value} className="flex items-start gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="visibility-change"
                  value={value}
                  checked={target === value}
                  onChange={() => setTarget(value)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">{t(`visibility.${key}`)}</span>
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {inc === 0
                      ? t('visibility.costFree')
                      : t('visibility.costCoins', { cost: inc })}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t(`visibility.${key}Help`)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {changed && (
          <p className="mt-3 text-sm text-muted-foreground">
            {cost === 0
              ? t('visibility.changeBodyFree', {
                  tier: t(`visibility.${VISIBILITY_I18N_KEY[target]}`),
                })
              : t('visibility.changeBody', {
                  tier: t(`visibility.${VISIBILITY_I18N_KEY[target]}`),
                  cost,
                })}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {t('visibility.balance', { balance: spendableBalance })}
        </p>
      </ConfirmationModal>
    </>
  );
}
