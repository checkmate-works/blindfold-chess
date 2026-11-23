import type { ReactNode } from 'react';

type AdminDataTableProps<T> = {
  headers: ReactNode[];
  items: T[];
  renderRow: (item: T, index: number) => ReactNode;
  emptyMessage: ReactNode;
  emptyColSpan?: number;
  /**
   * Cap the table's height and scroll its body, keeping the header row in
   * view — for a list that can grow long under other content on the page.
   */
  scrollable?: boolean;
};

export function AdminDataTable<T>({
  headers,
  items,
  renderRow,
  emptyMessage,
  emptyColSpan,
  scrollable = false,
}: AdminDataTableProps<T>) {
  const colSpan = emptyColSpan ?? headers.length;

  return (
    <div
      className={`rounded-lg border border-border ${scrollable ? 'max-h-96 overflow-auto' : 'overflow-x-auto'}`}
    >
      <table className="w-full text-sm">
        <thead className="bg-accent">
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                className={`text-left px-4 py-3 font-medium ${scrollable ? 'sticky top-0 z-10 bg-accent' : ''}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-card">
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
