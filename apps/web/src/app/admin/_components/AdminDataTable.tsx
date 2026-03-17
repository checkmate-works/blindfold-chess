import { ReactNode } from 'react';

type AdminDataTableProps<T> = {
  headers: ReactNode[];
  items: T[];
  renderRow: (item: T, index: number) => ReactNode;
  emptyMessage: ReactNode;
  emptyColSpan?: number;
};

export function AdminDataTable<T>({
  headers,
  items,
  renderRow,
  emptyMessage,
  emptyColSpan,
}: AdminDataTableProps<T>) {
  const colSpan = emptyColSpan ?? headers.length;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary">
          <tr>
            {headers.map((header, i) => (
              <th key={i} className="text-left px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => renderRow(item, index))}
          {items.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="px-4 py-8 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
