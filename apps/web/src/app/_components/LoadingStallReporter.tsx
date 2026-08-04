'use client';

import { useEffect } from 'react';

import * as Sentry from '@sentry/nextjs';

/** loading boundary がこの時間を超えて表示され続けたら 1 回だけ報告する。 */
const STALL_THRESHOLD_MS = 15_000;

type Props = {
  /** どの boundary か（例: 'profile-shell'）。Sentry 側でグルーピングに使う。 */
  boundary: string;
};

/**
 * loading.tsx に置く「ナビゲーション固着」検知器。
 *
 * @design なぜタイマーが監視になるのか
 * 本番で「ソフトナビゲーションのコミット後、新ツリーの描画が React #310
 * (Next.js App Router 内部のフレームワークバグ) で死に、スケルトンが永久に
 * 残る」障害が観測された (2026-08-05)。この障害はユーザ操作(リロード)で
 * しか回復せず、自発的なエラー報告も出ない — Sentry に届いた #310 は偶然の
 * 副産物だった。スケルトンは正常なら数秒で unmount されるので、閾値を超えて
 * 生きていること自体が異常のシグナルになる。unmount でタイマーが破棄される
 * ため、正常なロードでは何も送られない。閾値は最悪ケースの正常ロード
 * (コールドスタート + 低速回線) より十分長く取ってある。
 *
 * @design 何を判定するためのものか
 * この障害は本番の streaming 環境でしか再現しないので、Next.js 16.3.0 への
 * アップグレード (同 2026-08-05) が効いたかどうかをローカル検証では確かめ
 * られない。「直った」の判定はデプロイ後にこのイベント数がゼロになることで
 * 行う。ゼロにならなければ upstream 報告の材料になる。
 *
 * `deploymentId` は Vercel Skew Protection（または next.config の
 * `deploymentId`）が有効なときだけ値を持つ。有効化後は、レスポンスヘッダ
 * `x-nextjs-deployment-id` と突き合わせることで「古いバンドルを掴んだタブ」
 * (deployment skew) とフレームワークバグを事後に切り分けられる。現状は未設定
 * なので null が入る — 送信自体の意味は変わらないので、値がないことを理由に
 * 報告を止めない。
 */
export function LoadingStallReporter({ boundary }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      Sentry.captureMessage(`loading-boundary-stalled:${boundary}`, {
        level: 'warning',
        extra: {
          pathname: window.location.pathname,
          deploymentId: (globalThis as { NEXT_DEPLOYMENT_ID?: string }).NEXT_DEPLOYMENT_ID ?? null,
          thresholdMs: STALL_THRESHOLD_MS,
        },
      });
    }, STALL_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, [boundary]);

  return null;
}
