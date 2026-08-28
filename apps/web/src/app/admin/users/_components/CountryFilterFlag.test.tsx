import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { EMPTY_ADMIN_USER_FILTERS } from '../_lib/filters';
import { CountryFilterFlag } from './CountryFilterFlag';

afterEach(cleanup);

const label = 'Filter by country';

describe('CountryFilterFlag', () => {
  it('links to the list narrowed to that country, keeping the other filters', () => {
    render(
      <CountryFilterFlag
        code="JP"
        filters={{ ...EMPTY_ADMIN_USER_FILTERS, statusFilter: 'banned' }}
        label={label}
      />
    );

    const link = screen.getByRole('link', { name: `${label}: Japan` });
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('country=JP');
    expect(href).toContain('status=banned');
    // Narrowing changes the result set, so the old page number is meaningless.
    expect(href).toContain('page=1');
    expect(link).toHaveTextContent('🇯🇵');
  });

  it('drops the link when the list is already filtered to that country', () => {
    render(
      <CountryFilterFlag
        code="JP"
        filters={{ ...EMPTY_ADMIN_USER_FILTERS, countryFilter: 'JP' }}
        label={label}
      />
    );

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByLabelText('Japan')).toHaveTextContent('🇯🇵');
  });

  it('renders nothing for a code outside ISO 3166-1 alpha-2', () => {
    const { container } = render(
      <CountryFilterFlag code="ZZ" filters={EMPTY_ADMIN_USER_FILTERS} label={label} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
