type Props = {
  message: string | null;
  /**
   * Visual variant:
   * - 'inline' (default): simple rounded banner, left-aligned text
   * - 'bordered': adds a border and centers the text
   */
  variant?: 'inline' | 'bordered';
};

/**
 * Displays an error message banner for forms.
 * Renders nothing when message is null/empty.
 */
export function FormErrorBanner({ message, variant = 'inline' }: Props) {
  if (!message) return null;

  if (variant === 'bordered') {
    return (
      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
        <p className="text-sm text-destructive">{message}</p>
      </div>
    );
  }

  return <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{message}</div>;
}
