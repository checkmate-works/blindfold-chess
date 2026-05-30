/**
 * Inline success/error line for admin forms. Renders nothing when `message` is
 * null, so callers can pass their message state directly without a guard.
 * Pure presentational (no hooks).
 */
export type FormMessageState = { type: 'success' | 'error'; text: string } | null;

type FormMessageProps = {
  message: FormMessageState;
};

export function FormMessage({ message }: FormMessageProps) {
  if (!message) return null;

  return (
    <p
      className={`text-sm ${
        message.type === 'success' ? 'text-success-soft-foreground' : 'text-destructive'
      }`}
    >
      {message.text}
    </p>
  );
}
