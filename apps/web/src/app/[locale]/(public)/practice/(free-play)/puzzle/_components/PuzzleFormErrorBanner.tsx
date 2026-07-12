/** The red error strip rendered above every puzzle authoring step's fields. */
export function PuzzleFormErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
      {message}
    </div>
  );
}
