import { getMissColorClass } from '@/lib/challenge-constants';

type SessionRow = {
  date: string;
  correctAnswers: string;
  incorrectAnswers: number;
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
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 sm:px-3 text-muted-foreground font-medium">
              {headers.date}
            </th>
            <th className="text-right py-2 px-2 sm:px-3 text-muted-foreground font-medium whitespace-nowrap">
              {headers.correctAnswers}
            </th>
            <th className="text-right py-2 px-2 sm:px-3 text-muted-foreground font-medium whitespace-nowrap">
              {headers.incorrectAnswers}
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-2 px-2 sm:px-3 text-foreground">{session.date}</td>
              <td className="py-2 px-2 sm:px-3 text-right text-foreground">
                {session.correctAnswers}
              </td>
              <td
                className={`py-2 px-2 sm:px-3 text-right ${getMissColorClass(session.incorrectAnswers)}`}
              >
                {session.incorrectAnswers}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
