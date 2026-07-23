/**
 * Replaces the profile's tab content when a block exists in either direction.
 * The message differs by who blocked whom: if the viewer did the blocking they
 * can undo it (the header still shows Unblock); if they were blocked, the
 * content is simply unavailable.
 */
export function ProfileBlockedNotice({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-border bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
