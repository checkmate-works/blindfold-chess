'use client';

type SessionRow = {
  date: string;
  accuracy: string;
  correctAnswers: string;
  throughput: string;
};

type Props = {
  sessions: SessionRow[];
  emptyMessage: string;
  headers: {
    date: string;
    accuracy: string;
    correctAnswers: string;
    throughput: string;
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
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">
              {headers.date}
            </th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">
              {headers.accuracy}
            </th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">
              {headers.correctAnswers}
            </th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">
              {headers.throughput}
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-2 px-3 text-foreground">{session.date}</td>
              <td className="py-2 px-3 text-right text-foreground">{session.accuracy}</td>
              <td className="py-2 px-3 text-right text-foreground">{session.correctAnswers}</td>
              <td className="py-2 px-3 text-right text-foreground">{session.throughput}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
