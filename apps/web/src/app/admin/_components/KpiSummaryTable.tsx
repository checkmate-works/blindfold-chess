import type { KpiSummary, UgcBreakdownRow } from '../_lib/queries';

type Labels = {
  category: string;
  metric: string;
  value: string;
  users: string;
  ugcPosts: string;
  likes: string;
  avgPerDay: string;
  avgPerActivePoster: string;
  total: string;
  /** Map of UGC source identifier → human-readable prefix (e.g. "topic_posts" → "Topic Posts"). */
  sourceLabels: Record<string, string>;
  /** Map of "<source>.<key>" → human-readable label. Falls back to the raw key. */
  breakdownLabels: Record<string, string>;
};

type Props = {
  data: KpiSummary;
  labels: Labels;
  /** BCP-47 locale tag for number formatting. Defaults to 'en'. */
  locale?: string;
};

function formatInt(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDecimal(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function breakdownLabel(row: UgcBreakdownRow, labels: Labels): string {
  const sourcePrefix = labels.sourceLabels[row.source] ?? row.source;
  const lookupKey = `${row.source}.${row.key}`;
  const keyLabel = labels.breakdownLabels[lookupKey] ?? row.key;
  return `${sourcePrefix}: ${keyLabel}`;
}

export function KpiSummaryTable({ data, labels, locale = 'en' }: Props) {
  const { users, ugcPosts, likes } = data;

  // UGC block has: avgPerDay, avgPerActivePoster, total, plus one row per breakdown entry.
  const ugcRowCount = 3 + ugcPosts.breakdown.length;

  // Shared class strings for consistency across category cells and total rows.
  const categoryCellClass = 'px-4 py-3 font-medium align-top border-r border-border text-left';
  const totalRowClass = 'border-t-2 border-border bg-accent/40 font-semibold';

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-accent">
          <tr>
            <th scope="col" className="text-left px-4 py-3 font-medium">
              {labels.category}
            </th>
            <th scope="col" className="text-left px-4 py-3 font-medium">
              {labels.metric}
            </th>
            <th scope="col" className="text-right px-4 py-3 font-medium">
              {labels.value}
            </th>
          </tr>
        </thead>
        <tbody className="bg-card">
          {/* Users — rowspan=2 (avgPerDay + total) */}
          <tr className="border-t border-border">
            <th scope="rowgroup" rowSpan={2} className={categoryCellClass}>
              {labels.users}
            </th>
            <td className="px-4 py-3 text-muted-foreground">{labels.avgPerDay}</td>
            <td className="px-4 py-3 text-right tabular-nums">
              {formatDecimal(users.avgPerDay, locale)}
            </td>
          </tr>
          <tr className={totalRowClass}>
            <td className="px-4 py-3">{labels.total}</td>
            <td className="px-4 py-3 text-right tabular-nums">{formatInt(users.total, locale)}</td>
          </tr>

          {/* UGC Posts — rowspan on the category cell */}
          <tr className="border-t border-border">
            <th scope="rowgroup" rowSpan={ugcRowCount} className={categoryCellClass}>
              {labels.ugcPosts}
            </th>
            <td className="px-4 py-3 text-muted-foreground">{labels.avgPerDay}</td>
            <td className="px-4 py-3 text-right tabular-nums">
              {formatDecimal(ugcPosts.avgPerDay, locale)}
            </td>
          </tr>
          <tr className="border-t border-border">
            <td className="px-4 py-3 text-muted-foreground">{labels.avgPerActivePoster}</td>
            <td className="px-4 py-3 text-right tabular-nums">
              {formatDecimal(ugcPosts.avgPerActivePoster, locale)}
            </td>
          </tr>
          <tr className={totalRowClass}>
            <td className="px-4 py-3">{labels.total}</td>
            <td className="px-4 py-3 text-right tabular-nums">
              {formatInt(ugcPosts.total, locale)}
            </td>
          </tr>
          {ugcPosts.breakdown.map((row) => (
            <tr key={`${row.source}-${row.key}`} className="border-t border-border">
              <td className="px-4 py-3 text-muted-foreground pl-6">
                {breakdownLabel(row, labels)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatInt(row.count, locale)}</td>
            </tr>
          ))}

          {/* Likes — rowspan=2 (avgPerDay + total) */}
          <tr className="border-t border-border">
            <th scope="rowgroup" rowSpan={2} className={categoryCellClass}>
              {labels.likes}
            </th>
            <td className="px-4 py-3 text-muted-foreground">{labels.avgPerDay}</td>
            <td className="px-4 py-3 text-right tabular-nums">
              {formatDecimal(likes.avgPerDay, locale)}
            </td>
          </tr>
          <tr className={totalRowClass}>
            <td className="px-4 py-3">{labels.total}</td>
            <td className="px-4 py-3 text-right tabular-nums">{formatInt(likes.total, locale)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
