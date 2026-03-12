'use client';

type SessionRow = {
  date: string;
  correctAnswers: string;
  incorrectAnswers: number | null;
  mistakeAllowance: number | null;
};

type Props = {
  sessions: SessionRow[];
  emptyMessage: string;
  headers: {
    date: string;
    correctAnswers: string;
    incorrectAnswers: string;
  };
};

function getIncorrectAnswersClassName(
  incorrectAnswers: number | null,
  mistakeAllowance: number | null
): string {
  if (incorrectAnswers === null) return 'text-foreground';
  if (mistakeAllowance !== null && incorrectAnswers >= mistakeAllowance) return 'text-destructive';
  if (incorrectAnswers === 0) return 'text-success';
  return 'text-foreground';
}

export function SessionHistoryTable({ sessions, emptyMessage, headers }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[28rem]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-muted-foreground font-medium whitespace-nowrap">
              {headers.date}
            </th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium whitespace-nowrap">
              {headers.correctAnswers}
            </th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium whitespace-nowrap">
              {headers.incorrectAnswers}
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-2 px-3 text-foreground whitespace-nowrap">{session.date}</td>
              <td className="py-2 px-3 text-right text-foreground">{session.correctAnswers}</td>
              <td
                className={`py-2 px-3 text-right ${getIncorrectAnswersClassName(session.incorrectAnswers, session.mistakeAllowance)}`}
              >
                {session.incorrectAnswers !== null ? `${session.incorrectAnswers}` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
