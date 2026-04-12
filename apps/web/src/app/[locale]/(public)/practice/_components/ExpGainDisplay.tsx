import type { ExpInfo } from '@blindfold-chess/features/exp';

type Props = {
  expInfo: ExpInfo | null;
};

/**
 * Displays earned EXP, current level, and level progress bar on the practice
 * result screen. Rendered as a Server Component — the `expInfo` is fetched by
 * the result page Server Component via `getExpInfoBySource` (keyed off the
 * `?grant=<challenge_result_id>` query param) and passed in as a prop.
 *
 * Renders `null` when `expInfo` is null (e.g., unauthenticated users, direct
 * access without a `grant` param, or when the event is not found).
 */
export function ExpGainDisplay({ expInfo }: Props) {
  if (!expInfo) return null;

  const { earnedExp, level, levelUp, progressPercent } = expInfo;

  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-4">
      {/* Earned EXP */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">EXP</span>
        <span className="text-lg font-bold text-primary">+{earnedExp} EXP</span>
      </div>

      {/* Level and progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-foreground">Lv.{level}</span>
          <span className="text-xs text-muted-foreground">{progressPercent}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Level up notification */}
      {levelUp && (
        <div className="mt-3 text-center">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            Level Up!
          </span>
        </div>
      )}
    </div>
  );
}
