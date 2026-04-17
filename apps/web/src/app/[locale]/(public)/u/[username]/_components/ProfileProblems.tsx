import { Link } from '@/i18n/routing';

import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

import { PaginationNav } from '@/app/[locale]/_components';

type Position = {
  id: string;
  type: string;
  fen: string;
  title: string;
  description: string | null;
  createdAt: Date;
};

type Props = {
  positions: Position[];
  currentPage: number;
  totalPages: number;
  locale: string;
  buildHref: (page: number) => string;
  labels: {
    noProblems: string;
    problemTypeMemory: string;
    problemTypePuzzle: string;
  };
};

function getPositionHref(type: string, id: string): string {
  if (type === 'puzzle') return `/practice/puzzle/${id}`;
  return `/practice/position-memory/${id}`;
}

function TypeBadge({ type, label }: { type: string; label: string }) {
  const colorClass =
    type === 'puzzle'
      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';

  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

export function ProfileProblems({
  positions,
  currentPage,
  totalPages,
  locale,
  buildHref,
  labels,
}: Props) {
  return (
    <div>
      <div className="mt-4 space-y-3">
        {positions.length > 0 ? (
          positions.map((position) => (
            <Link
              key={position.id}
              href={getPositionHref(position.type, position.id)}
              locale={locale}
              className="flex gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
            >
              <BoardThumbnail fen={position.fen} className="w-16 h-16 sm:w-20 sm:h-20 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {position.title}
                  </h3>
                  <TypeBadge
                    type={position.type}
                    label={
                      position.type === 'puzzle'
                        ? labels.problemTypePuzzle
                        : labels.problemTypeMemory
                    }
                  />
                </div>
                {position.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {position.description}
                  </p>
                )}
                <time
                  dateTime={position.createdAt.toISOString()}
                  className="mt-1 block text-xs text-muted-foreground"
                >
                  {position.createdAt.toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
              </div>
            </Link>
          ))
        ) : (
          <p className="py-8 text-center text-muted-foreground">{labels.noProblems}</p>
        )}
      </div>

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
