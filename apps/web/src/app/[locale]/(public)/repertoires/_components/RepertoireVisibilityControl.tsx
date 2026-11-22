'use client';

import { useState } from 'react';

import { useRouter } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { localizeActionErrorOrGeneric } from '@/lib/i18n/localize-action-error';
import type { RepertoireVisibility } from '@/lib/repertoires/visibility';
import { REPERTOIRE_VISIBILITIES } from '@/lib/repertoires/visibility';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useConfirmAction } from '@/app/[locale]/_hooks/use-confirm-action';

import { changeVisibility } from '../[id]/_actions/changeVisibility';
import { VISIBILITY_I18N_KEY } from '../_lib/visibility-i18n';

type Props = {
  id: string;
  locale: string;
  /** The repertoire's current visibility tier. */
  current: RepertoireVisibility;
};

/**
 * Owner-only control to change a Kata's visibility tier. Opens a modal listing
 * the three tiers; confirming calls the `changeVisibility` action. On success
 * the page refreshes so the status chip updates.
 */
export function RepertoireVisibilityControl({ id, locale, current }: Props) {
  const t = useTranslations('Repertoires');
  const router = useRouter();
  const [target, setTarget] = useState<RepertoireVisibility>(current);
  const { isOpen, open, cancel, isPending, error, setError, run } = useConfirmAction();

  const changed = target !== current;

  function openModal() {
    setTarget(current);
    setError(null);
    open();
  }

  async function apply() {
    if (!changed) {
      cancel();
      return;
    }
    await run(
      () => changeVisibility({ id, target, locale }),
      (result) => ('error' in result ? localizeActionErrorOrGeneric(result.error, t) : null),
      () => router.refresh()
    );
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
        isOpen={isOpen}
        title={t('visibility.changeTitle')}
        error={error}
        confirmText={t('visibility.changeConfirm')}
        cancelText={t('visibility.cancel')}
        isLoading={isPending}
        onConfirm={() => void apply()}
        onCancel={cancel}
      >
        <div className="mt-2 space-y-2">
          {REPERTOIRE_VISIBILITIES.map((value) => {
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
                  {/* Repertoires.visibility.<key> / <key>Help (VISIBILITY_I18N_KEY): Repertoires.visibility.public, Repertoires.visibility.publicHelp, Repertoires.visibility.followersOnly, Repertoires.visibility.followersOnlyHelp, Repertoires.visibility.private, Repertoires.visibility.privateHelp */}
                  <span className="font-medium">{t(`visibility.${key}`)}</span>
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
            {/* tier: Repertoires.visibility.public, Repertoires.visibility.followersOnly, Repertoires.visibility.private (VISIBILITY_I18N_KEY) */}
            {t('visibility.changeBody', {
              tier: t(`visibility.${VISIBILITY_I18N_KEY[target]}`),
            })}
          </p>
        )}
      </ConfirmationModal>
    </>
  );
}
