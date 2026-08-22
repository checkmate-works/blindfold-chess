import en from '@/messages/en.json';
import { describe, expect, it } from 'vitest';

import { PRINCIPLES, PRINCIPLE_IDS, isPrincipleId } from './principles';

describe('principles', () => {
  it('has unique ids and ends with the escape hatch', () => {
    expect(new Set(PRINCIPLE_IDS).size).toBe(PRINCIPLE_IDS.length);
    expect(PRINCIPLE_IDS.at(-1)).toBe('other');
  });

  it('has a display name and definition for every principle except "other"', () => {
    const messages = en.sharedGames.aiReview.principles as Record<
      string,
      { name: string; definition: string }
    >;
    for (const { id } of PRINCIPLES) {
      if (id === 'other') continue;
      expect(messages[id]?.name, id).toBeTruthy();
      expect(messages[id]?.definition, id).toBeTruthy();
    }
    // And nothing stale in the other direction.
    expect(Object.keys(messages).sort()).toEqual(
      PRINCIPLE_IDS.filter((id) => id !== 'other').sort()
    );
  });

  it('guards ids at runtime', () => {
    expect(isPrincipleId('other')).toBe(true);
    expect(isPrincipleId('be_awesome')).toBe(false);
  });
});
