type Props = {
  message: string | null;
};

/**
 * Displays an error message banner for forms.
 * Renders nothing when message is null/empty.
 */
export function FormErrorBanner({ message }: Props) {
  if (!message) return null;

  return <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{message}</div>;
}
