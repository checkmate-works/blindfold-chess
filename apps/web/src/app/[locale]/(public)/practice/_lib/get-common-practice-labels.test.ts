import { describe, expect, it, vi } from 'vitest';

import { getCommonPracticeCompleteLabels } from './get-common-practice-labels';

describe('getCommonPracticeCompleteLabels', () => {
  /**
   * 意図的な再割り当てテスト:
   *
   * ラベル `morePractice` は、翻訳キー `morePractice` ではなく意図的に
   * `changeSettings` の訳を指すようマッピングされている。これはプレゼンテーション
   * レイヤーで再利用している "Change settings" 文言と意味論上のラベル名
   * (`morePractice`) を分離するための設計上の決定であり、
   * 他のラベル (practiceComplete 等) のような単純な同名マッピングではない。
   *
   * この再割り当てを意図せず外すと、UI のラベルと実文言が食い違うため、
   * ここは挙動仕様としてロックしておく。その他のキーは t() の戻り値を
   * そのまま返す同語反復なのでテスト対象から除外した。
   */
  it('maps morePractice to the changeSettings translation key', () => {
    const mockT = vi.fn((key: string) => `translated_${key}`);
    const result = getCommonPracticeCompleteLabels(mockT);
    expect(result.morePractice).toBe('translated_changeSettings');
  });
});
