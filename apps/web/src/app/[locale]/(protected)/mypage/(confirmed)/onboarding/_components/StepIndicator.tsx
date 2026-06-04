type Props = {
  /** Total number of steps. */
  count: number;
  /** Zero-based index of the active step. */
  currentStepIndex: number;
};

/**
 * Numbered progress dots (1-2-3-4) connected by short rules. Visual ported
 * from the legacy onboarding's StepIndicator; rendered at the top of the
 * PagePanel by `OnboardingWizard`.
 */
export function StepIndicator({ count, currentStepIndex }: Props) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              index === currentStepIndex
                ? 'bg-primary text-primary-foreground'
                : index < currentStepIndex
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {index + 1}
          </div>
          {index < count - 1 && (
            <div
              className={`h-0.5 w-8 transition-colors ${
                index < currentStepIndex ? 'bg-primary/40' : 'bg-muted'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
