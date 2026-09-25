import type { ReactNode, Ref } from 'react';

/** JSX half of the `@/app/_components` manual mock — see `./index.ts`. */

export function BoardFrame({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

export function BoardSkeleton() {
  return <div data-testid="board-skeleton" />;
}

export function Button({
  children,
  type,
  disabled,
  onClick,
  loading,
}: {
  children: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <button type={type ?? 'button'} disabled={disabled} onClick={onClick} data-loading={loading}>
      {children}
    </button>
  );
}

export function FlipBoardButton({ onClick, title }: { onClick?: () => void; title?: string }) {
  return <button type="button" data-testid="flip-board" onClick={onClick} title={title} />;
}

export function FormActionFooter({
  children,
  cancel,
}: {
  children: ReactNode;
  cancel?: { label: ReactNode; onClick: () => void; disabled?: boolean };
}) {
  return (
    <div>
      {children}
      {cancel && (
        <button type="button" onClick={cancel.onClick} disabled={cancel.disabled}>
          {cancel.label}
        </button>
      )}
    </div>
  );
}

export function FormErrorBanner({
  message,
  ref,
}: {
  message: string | null;
  ref?: Ref<HTMLDivElement>;
}) {
  return message ? (
    <div ref={ref} tabIndex={-1} role="alert">
      {message}
    </div>
  ) : null;
}

export function LocalizedUnsavedChangesDialog() {
  return null;
}
