import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthErrorMessage } from './AuthErrorMessage';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

describe('AuthErrorMessage', () => {
  it('should render the auth error message', () => {
    render(<AuthErrorMessage namespace="signIn" />);

    expect(screen.getByText('authError')).toBeInTheDocument();
  });

  it('should render with appropriate error styling', () => {
    const { container } = render(<AuthErrorMessage namespace="signUp" />);

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('bg-destructive');
    expect(wrapper.className).toContain('border');
  });
});
