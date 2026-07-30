/**
 * Validation message rendered directly under the control that failed,
 * plus the two helpers that wire a control to it.
 *
 * Placing the message at the control (rather than only in a strip at the
 * top of the form) is what keeps a failed submit legible on a long form:
 * the author never has to scroll away from the button to learn why it
 * refused. Pair it with `useSubmitError`, which moves focus here.
 */
type Props = {
  /** Matches the control's `aria-describedby`. */
  id: string;
  /** `null` renders nothing, so callers can pass a lookup result directly. */
  message: string | null;
};

export function FieldError({ id, message }: Props) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className="mt-1 text-sm text-destructive">
      {message}
    </p>
  );
}

/**
 * Spread onto the input/textarea/select the message belongs to. Announces
 * the invalid state and points screen readers at the explanation instead
 * of leaving them with a control that is red for sighted users only.
 */
export function fieldErrorProps(id: string, message: string | null) {
  return message ? ({ 'aria-invalid': true, 'aria-describedby': id } as const) : {};
}

/** Border utility for a control, red while it holds an error. */
export function fieldBorderClass(message: string | null) {
  return message ? 'border-destructive' : 'border-border';
}
