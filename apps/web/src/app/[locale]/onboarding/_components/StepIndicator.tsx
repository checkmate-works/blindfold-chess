type Step = {
  id: string;
  label: string;
};

type Props = {
  steps: Step[];
  currentStepIndex: number;
};

export function StepIndicator({ steps, currentStepIndex }: Props) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
              index === currentStepIndex
                ? 'bg-primary text-primary-foreground'
                : index < currentStepIndex
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {index + 1}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 transition-colors ${
                index < currentStepIndex ? 'bg-primary/40' : 'bg-muted'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
