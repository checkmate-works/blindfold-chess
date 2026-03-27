import { Link } from '@/i18n/routing';

import type { InterviewQuestionKey } from '@/app/[locale]/_lib/interview';

type Props = {
  questionKey: InterviewQuestionKey;
  label: string;
  description: string;
  isAuthenticated: boolean;
  isAnswered: boolean;
  answeredLabel: string;
  notAnsweredLabel: string;
  locale: string;
};

export function InterviewQuestionCard({
  questionKey,
  label,
  description,
  isAuthenticated,
  isAnswered,
  answeredLabel,
  notAnsweredLabel,
  locale,
}: Props) {
  return (
    <Link
      href={`/interview/${questionKey}`}
      locale={locale}
      className="group block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted hover:shadow-md hover:border-foreground/20"
    >
      <h2 className="text-base font-semibold text-card-foreground">{label}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {isAuthenticated && (
        <p className="mt-2 text-xs">
          {isAnswered ? (
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
              <span aria-hidden="true">&#10003;</span>
              {answeredLabel}
            </span>
          ) : (
            <span className="text-muted-foreground italic">{notAnsweredLabel}</span>
          )}
        </p>
      )}
    </Link>
  );
}
