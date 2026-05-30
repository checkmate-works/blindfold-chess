'use client';

import { useState, useTransition } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';

import { type RedeemAdFreeResult, redeemAdFree } from '../_actions/redeemAdFree';

type Props = {
  balance: number;
  daysPerPoint: number;
};

/**
 * Inline redeem control rendered when the user has ≥1 point.
 *
 * @design Client-side input clamp
 *
 * The amount input is clamped to `[1, balance]` in `onChange` so
 * the user cannot send a value the server will just reject — better UX
 * than a round-trip rejection. The Server Action still re-validates so
 * the client clamp is a hint, not a security boundary.
 *
 * @design Button-disable during pending
 *
 * `useTransition` + `pending` guards the submit button so a double-click
 * does not fire two requests. The server-side conditional debit would
 * still serialize, but we want the UI to feel intentional too.
 */
export function RedeemForm({ balance, daysPerPoint }: Props) {
  const t = useTranslations('MypagePoints');
  const router = useRouter();
  const [amount, setAmount] = useState<number>(Math.min(1, balance));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ days: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const days = amount * daysPerPoint;

  const handleAmountChange = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      setAmount(1);
      return;
    }
    setAmount(Math.min(Math.max(1, parsed), balance));
  };

  const handleSubmit = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result: RedeemAdFreeResult = await redeemAdFree(amount);
      if (!result.ok) {
        setError(t(`redeem.errors.${result.error}`));
        return;
      }
      setSuccess({ days: result.durationDays });
      // Toggle the same `<html data-ads-hidden>` attribute the inline
      // no-flash script writes on initial page load. The Server Action
      // already wrote the `bfc_ads_hidden` cookie, but the attribute is
      // only read once at boot — without this update, the CSS rule that
      // hides ad slots would not apply to the current view and the user
      // would keep seeing ads until a full reload.
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.adsHidden = 'true';
      }
      // Refresh the RSC payload so the new balance / history snapshot
      // renders without a full navigation.
      router.refresh();
    });
  };

  if (balance < 1) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{t('redeem.title')}</h3>
      <p className="text-sm text-muted-foreground">{t('redeem.description')}</p>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={balance}
          step={1}
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          className="w-24 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          disabled={pending}
        />
        <span className="text-sm text-muted-foreground">{t('redeem.pointSuffix')}</span>
        <span className="text-sm text-muted-foreground">→</span>
        <span className="text-sm font-medium text-foreground">
          {t('redeem.daysReceived', { days })}
        </span>
      </div>

      <Button onClick={handleSubmit} disabled={pending} variant="primary">
        {pending ? t('redeem.submitting') : t('redeem.submit', { amount })}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <p className="text-sm text-foreground">
          {t('redeem.successMessage', { days: success.days })}
        </p>
      )}
    </div>
  );
}
