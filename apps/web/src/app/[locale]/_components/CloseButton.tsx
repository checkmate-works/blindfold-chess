type Props = {
  onClick: () => void;
  /** Size class for the SVG icon. Defaults to 'w-6 h-6'. */
  size?: string;
  /** Additional CSS classes for the button element */
  className?: string;
  /** Accessible label. Defaults to 'Close'. */
  ariaLabel?: string;
};

/**
 * Standardized close (X) button used across modals and overlays.
 */
export function CloseButton({
  onClick,
  size = 'w-6 h-6',
  className = 'text-muted-foreground hover:text-foreground',
  ariaLabel = 'Close',
}: Props) {
  return (
    <button type="button" onClick={onClick} className={className} aria-label={ariaLabel}>
      <svg className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
}
