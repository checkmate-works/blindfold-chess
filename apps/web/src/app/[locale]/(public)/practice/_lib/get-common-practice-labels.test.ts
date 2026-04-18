import { describe, expect, it, vi } from 'vitest';

import { getCommonPracticeCompleteLabels } from './get-common-practice-labels';

describe('getCommonPracticeCompleteLabels', () => {
  /**
   * Intentional re-mapping test:
   *
   * The label `morePractice` is intentionally mapped to the translation of
   * `changeSettings`, not to the translation key `morePractice`. This is a
   * design decision to keep the semantic label name (`morePractice`) separate
   * from the "Change settings" wording that is reused in the presentation
   * layer; it is NOT a simple same-name mapping like the other labels
   * (e.g., `practiceComplete`).
   *
   * Accidentally removing this re-mapping would cause the UI label and the
   * actual wording to drift apart, so this behavior is locked in as a
   * specification test. Other keys are excluded from the test because they
   * are tautological same-name mappings that just return `t()`'s result as-is.
   */
  it('maps morePractice to the changeSettings translation key', () => {
    const mockT = vi.fn((key: string) => `translated_${key}`);
    const result = getCommonPracticeCompleteLabels(mockT);
    expect(result.morePractice).toBe('translated_changeSettings');
  });
});
