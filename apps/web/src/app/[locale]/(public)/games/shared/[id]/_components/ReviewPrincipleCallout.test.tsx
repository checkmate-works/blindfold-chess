import { NextIntlClientProvider } from 'next-intl';

import { IntlAvailableContext } from '@/i18n/IntlAvailableContext';
import enMessages from '@/messages/en.json';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PRINCIPLES } from '@/lib/ai-review/principles';

import { ReviewPrincipleCallout } from './ReviewPrincipleCallout';

expect.extend(matchers);
afterEach(cleanup);

/**
 * Rendered against the REAL English dictionary, not the identity mock: the
 * principle id reaches the translator as a dynamic key
 * (`aiReview.principles.${id}.name`), which no static key check can see, so
 * this is where a principle added to the catalogue without its copy shows up.
 */
function renderWithDictionary(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider
      locale="en"
      messages={enMessages as unknown as Record<string, unknown>}
      timeZone="UTC"
    >
      <IntlAvailableContext.Provider value={true}>{ui}</IntlAvailableContext.Provider>
    </NextIntlClientProvider>
  );
}

describe('ReviewPrincipleCallout', () => {
  it('shows the name and definition from the dictionary', () => {
    renderWithDictionary(<ReviewPrincipleCallout principle="develop_before_attacking" />);

    expect(screen.getByText('Develop before attacking')).toBeInTheDocument();
    expect(screen.getByText(/Bring the minor pieces out and castle/)).toBeInTheDocument();
  });

  it('resolves copy for every catalogued principle', () => {
    for (const { id } of PRINCIPLES) {
      if (id === 'other') continue;
      const { unmount } = renderWithDictionary(<ReviewPrincipleCallout principle={id} />);
      // A missing message would render the key path itself.
      expect(document.body.textContent).not.toContain('aiReview.principles');
      unmount();
    }
  });

  it('renders nothing for "other" and for a review without a principle', () => {
    const { container } = renderWithDictionary(
      <>
        <ReviewPrincipleCallout principle="other" />
        <ReviewPrincipleCallout principle={undefined} />
      </>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
