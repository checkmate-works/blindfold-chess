import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MoveInput } from './MoveInput';

vi.mock('next-intl');

// The autocomplete suggestion engine hits chess-core; stub it so this test
// exercises only the rendered DOM shape.
vi.mock('../_hooks', () => ({
  useMoveSuggestions: () => ({
    suggestions: [] as string[],
    showSuggestions: false,
    updateSuggestions: () => {},
    hideSuggestions: () => {},
  }),
}));

describe('MoveInput — does not auto-submit a surrounding form', () => {
  // Regression guard for the puzzle-creator bug where MoveInput used to wrap
  // its input + confirm button in its own `<form>`. Nested forms are invalid
  // per the HTML spec: the inner `<form>` tag is parsed away and the confirm
  // button is reparented onto the outer form, which then submits on click.
  //
  // This test mounts MoveInput inside a parent `<form>` and asserts:
  //   (a) MoveInput renders NO `<form>` element of its own.
  //   (b) Clicking the confirm button does not dispatch the parent form's
  //       native submit event.
  //   (c) Pressing Enter in the input does not dispatch the parent form's
  //       native submit event.

  it('does not render its own <form> element', () => {
    const { container } = render(
      <MoveInput
        value=""
        onChange={() => {}}
        onSubmit={() => {}}
        showSuggestions={false}
        showSubmitButton={true}
      />
    );
    expect(container.querySelector('form')).toBeNull();
  });

  it('clicking the confirm button does not submit the surrounding form', () => {
    const parentSubmit = vi.fn();
    render(
      <form onSubmit={parentSubmit} data-testid="parent-form">
        <MoveInput
          value="e4"
          onChange={() => {}}
          onSubmit={() => {}}
          showSuggestions={false}
          showSubmitButton={true}
        />
      </form>
    );

    const confirmBtn = screen.getByRole('button', { name: 'action.submit' });
    fireEvent.click(confirmBtn);

    expect(parentSubmit).not.toHaveBeenCalled();
  });

  it('pressing Enter in the input does not submit the surrounding form', () => {
    const parentSubmit = vi.fn();
    render(
      <form onSubmit={parentSubmit} data-testid="parent-form">
        <MoveInput
          value="e4"
          onChange={() => {}}
          onSubmit={() => {}}
          showSuggestions={false}
          showSubmitButton={true}
        />
      </form>
    );

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(parentSubmit).not.toHaveBeenCalled();
  });

  it('clicking the confirm button still invokes onSubmit with the current value', () => {
    const onSubmit = vi.fn();
    render(
      <MoveInput
        value="Nf3"
        onChange={() => {}}
        onSubmit={onSubmit}
        showSuggestions={false}
        showSubmitButton={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'action.submit' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('Nf3', false);
  });

  it('pressing Enter in the input invokes onSubmit with the current value', () => {
    const onSubmit = vi.fn();
    render(
      <MoveInput
        value="Nf3"
        onChange={() => {}}
        onSubmit={onSubmit}
        showSuggestions={false}
        showSubmitButton={true}
      />
    );

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('Nf3', false);
  });
});
