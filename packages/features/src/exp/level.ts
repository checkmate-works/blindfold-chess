import { EXP_CURVE } from "./constants";
import type { LevelProgress } from "./types";

/**
 * 指定レベルに必要な累計Expを返す。
 * requiredExp(level) = floor(BASE * level^EXPONENT)
 */
export function getExpForLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.floor(EXP_CURVE.base * Math.pow(level, EXP_CURVE.exponent));
}

/**
 * 累計Expからレベルを算出する。
 * level = floor((totalExp / BASE) ^ (1/EXPONENT))
 */
export function getLevel(totalExp: number): number {
  if (totalExp <= 0) return 0;
  const rawLevel = Math.pow(totalExp / EXP_CURVE.base, 1 / EXP_CURVE.exponent);
  const level = Math.floor(rawLevel);

  // 浮動小数点の丸め誤差を考慮:
  // floor で切り捨てた結果が実際より1低い可能性があるため、
  // level+1 の必要Expも確認する
  if (getExpForLevel(level + 1) <= totalExp) {
    return level + 1;
  }
  if (getExpForLevel(level) > totalExp) {
    return level - 1;
  }
  return level;
}

/**
 * レベル進捗情報を返す。
 */
export function getLevelProgress(totalExp: number): LevelProgress {
  const level = getLevel(totalExp);
  const currentLevelExp = getExpForLevel(level);
  const nextLevelExp = getExpForLevel(level + 1);

  const expInCurrentLevel = totalExp - currentLevelExp;
  const expNeededForNext = nextLevelExp - currentLevelExp;

  const progress =
    expNeededForNext > 0 ? expInCurrentLevel / expNeededForNext : 0;

  return {
    level,
    currentLevelExp,
    nextLevelExp,
    progress,
  };
}
