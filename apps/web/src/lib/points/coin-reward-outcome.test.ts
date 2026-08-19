import { describe, expect, it } from 'vitest';

import { toCoinRewardOutcome } from './coin-reward-outcome';
import { buildCoinToastParams } from './coin-toast-params';

describe('toCoinRewardOutcome', () => {
  it('reports the receipt and no cap for a full grant', () => {
    expect(
      toCoinRewardOutcome({
        status: 'granted',
        pointEventId: 'pe-1',
        amount: 3,
        cappedDaily: false,
      })
    ).toEqual({ pointGrant: { pointEventId: 'pe-1', amount: 3 }, coinCapped: false });
  });

  it('flags the cap alongside a receipt when the award was trimmed', () => {
    expect(
      toCoinRewardOutcome({ status: 'granted', pointEventId: 'pe-1', amount: 1, cappedDaily: true })
    ).toEqual({ pointGrant: { pointEventId: 'pe-1', amount: 1 }, coinCapped: true });
  });

  it('flags the cap with no receipt when the award was blocked outright', () => {
    expect(toCoinRewardOutcome({ status: 'capped' })).toEqual({
      pointGrant: null,
      coinCapped: true,
    });
  });

  it('reports neither for a non-cap skip', () => {
    expect(toCoinRewardOutcome({ status: 'skipped' })).toEqual({
      pointGrant: null,
      coinCapped: false,
    });
  });
});

describe('buildCoinToastParams', () => {
  const params = (...args: Parameters<typeof buildCoinToastParams>) =>
    buildCoinToastParams(...args).toString();

  it('announces the amount earned', () => {
    expect(params({ pointGrant: { pointEventId: 'pe-1', amount: 3 }, coinCapped: false })).toBe(
      'coinsEarned=3'
    );
  });

  it('adds the cap warning alongside a trimmed award', () => {
    expect(params({ pointGrant: { pointEventId: 'pe-1', amount: 1 }, coinCapped: true })).toBe(
      'coinsEarned=1&coinsCapped=1'
    );
  });

  it('falls back to the plain confirmation only when nothing was earned', () => {
    expect(params({ pointGrant: null, coinCapped: false }, 'position_created')).toBe(
      'toast=position_created'
    );
    expect(
      params({ pointGrant: { pointEventId: 'pe-1', amount: 3 }, coinCapped: false }, 'x')
    ).toBe('coinsEarned=3');
  });

  it('says nothing when there was no grant and no fallback', () => {
    expect(params({ pointGrant: null, coinCapped: false })).toBe('');
  });

  it('warns about the cap even with no grant and no fallback', () => {
    expect(params({ pointGrant: null, coinCapped: true })).toBe('coinsCapped=1');
  });
});
