import { describe, expect, it } from 'vitest';

import { overviewTabParamValue, parseOverviewTabParam } from './overview-tab-param';

const fullPage = { showOverviewTabs: true, aiReview: true };

describe('parseOverviewTabParam', () => {
  it('round-trips every tab through its URL form', () => {
    for (const view of ['summary', 'discussion', 'aiReview'] as const) {
      expect(parseOverviewTabParam(overviewTabParamValue(view), fullPage)).toBe(view);
    }
  });

  it('spells the AI Review tab in kebab-case like the other ?tab= params', () => {
    expect(overviewTabParamValue('aiReview')).toBe('ai-review');
  });

  it('rejects values it does not know, including the state key itself', () => {
    expect(parseOverviewTabParam('aiReview', fullPage)).toBeNull();
    expect(parseOverviewTabParam('comments', fullPage)).toBeNull();
    expect(parseOverviewTabParam('', fullPage)).toBeNull();
    expect(parseOverviewTabParam(null, fullPage)).toBeNull();
  });

  it('rejects the AI Review when the page does not offer that tab', () => {
    expect(parseOverviewTabParam('ai-review', { ...fullPage, aiReview: false })).toBeNull();
  });

  it('accepts nothing when the tab row is not rendered at all', () => {
    const noTabs = { showOverviewTabs: false, aiReview: true };
    expect(parseOverviewTabParam('summary', noTabs)).toBeNull();
    expect(parseOverviewTabParam('discussion', noTabs)).toBeNull();
    expect(parseOverviewTabParam('ai-review', noTabs)).toBeNull();
  });
});
