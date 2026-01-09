/**
 * システムレベルで広告機能が有効かどうかを返す
 * 環境変数 NEXT_PUBLIC_ADS_ENABLED が false の場合は false を返す
 * 未設定の場合はデフォルトで true を返す
 */
export function isAdsSystemEnabled(): boolean {
  const envValue = process.env.NEXT_PUBLIC_ADS_ENABLED;

  // 環境変数が明示的に "false" の場合のみ false を返す
  if (envValue === 'false') {
    return false;
  }

  // それ以外（未設定、"true"、その他の値）の場合は true
  return true;
}
