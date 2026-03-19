import type { LeaderboardModule, LeaderboardPeriod } from './types';
import { MODULES, MODULE_KEYS, VALID_PERIODS } from './types';

export function isValidModule(value: string): value is LeaderboardModule {
  return (MODULES as string[]).includes(value);
}

export function isValidPeriod(value: string): value is LeaderboardPeriod {
  return (VALID_PERIODS as readonly string[]).includes(value);
}

export function isValidKey(module: LeaderboardModule, key: string): boolean {
  return MODULE_KEYS[module].includes(key);
}

export function isValidPage(page: number): boolean {
  return Number.isInteger(page) && page >= 1;
}
