import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GlossaryTermModalProvider } from '@/app/[locale]/_components/glossary-term/GlossaryTermModalProvider';
import type { TermPreview } from '@/app/[locale]/_components/glossary-term/types';

import { ReviewPrincipleCallout } from './ReviewPrincipleCallout';

vi.mock('@/i18n/use-safe-translations');

afterEach(cleanup);

const RECOUNT: TermPreview = {
  slug: 'recount-after-captures',
  name: '駒取りの後に数え直す',
  definition: '駒取り・ポーンの手・チェックのたびに、関係する駒の位置を確かめてから次を考える',
  href: '/ja/glossary/recount-after-captures',
};

function withTerms(terms: Record<string, TermPreview>, ui: React.ReactNode) {
  return render(
    <GlossaryTermModalProvider terms={terms} viewDetailsLabel="View">
      {ui}
    </GlossaryTermModalProvider>
  );
}

describe('ReviewPrincipleCallout', () => {
  it('links the principle by its glossary name, in the page locale', () => {
    withTerms(
      { [RECOUNT.slug]: RECOUNT },
      <ReviewPrincipleCallout principle="recount_after_captures" />
    );

    const link = screen.getByRole('link', { name: '駒取りの後に数え直す' });
    expect(link).toHaveAttribute('href', '/ja/glossary/recount-after-captures');
    expect(screen.getByText('aiReview.principleLabel:')).toBeInTheDocument();
    // The definition is the modal's, not the callout's.
    expect(screen.queryByText(RECOUNT.definition)).not.toBeInTheDocument();
  });

  it('renders nothing for "other" and for a term the page did not embed', () => {
    const { container } = withTerms(
      {},
      <>
        <ReviewPrincipleCallout principle="other" />
        <ReviewPrincipleCallout principle="recount_after_captures" />
      </>
    );
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders nothing outside a term-modal provider', () => {
    const { container } = render(<ReviewPrincipleCallout principle="recount_after_captures" />);
    expect(container).toBeEmptyDOMElement();
  });
});
