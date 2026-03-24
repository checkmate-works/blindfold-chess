/**
 * チャレンジモードのミス許容数（全メニュー共通）。
 *
 * この値はすべてのチャレンジモジュール（coordinate_quiz, legal_moves, square_colors）で
 * 共有される。ミスがこの数に達するとセッションが終了する。
 *
 * 現在は全メニューで同一の値を使用しているが、将来メニューごとに異なる値が
 * 必要になった場合は、メニューごとの設定テーブルやマッピングに移行する。
 * その際、以下の箇所が影響を受ける:
 * - 各チャレンジコンポーネントの useTimedSession 呼び出し
 * - ダッシュボードの完走判定ロジック (dashboard-utils.ts)
 * - リーダーボードの表示ロジック
 */
export const MISTAKE_LIMIT = 3;

/**
 * チャレンジモードの制限時間（秒）（全メニュー共通）。
 *
 * チャレンジは常に60秒固定。URLパラメータでの可変化は
 * セキュリティ上もビジネスロジック上も許容しない。
 */
export const CHALLENGE_TIME_LIMIT = 60;

export function getMissColorClass(incorrectAnswers: number): string {
  if (incorrectAnswers >= MISTAKE_LIMIT) return 'text-destructive';
  if (incorrectAnswers === 0) return 'text-success';
  return 'text-foreground';
}
