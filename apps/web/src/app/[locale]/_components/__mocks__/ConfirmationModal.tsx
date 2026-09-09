/**
 * `ConfirmationModal` reduced to what a form test can drive: when open, a
 * dialog labelled by its title holding a confirm and a cancel button.
 *
 * Opt in with a bare `vi.mock('@/app/[locale]/_components/ConfirmationModal')`.
 *
 * The real modal is portal-mounted and animated, which is noise for a test
 * that only wants to answer "confirm" or "cancel" to the unsaved-changes or
 * position-changed prompt. The two puzzle-authoring form suites had this same
 * stub; suites that need something else (a `data-testid` on the confirm
 * button, or nothing rendered at all) keep their own factory.
 */
export function ConfirmationModal({
  isOpen,
  title,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div role="dialog" aria-label={title}>
      <button type="button" onClick={onConfirm}>
        {confirmText ?? 'Confirm'}
      </button>
      <button type="button" onClick={onCancel}>
        {cancelText ?? 'Cancel'}
      </button>
    </div>
  );
}
