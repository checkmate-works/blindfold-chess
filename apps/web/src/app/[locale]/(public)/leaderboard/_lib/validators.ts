import type { LeaderboardModule, LeaderboardPeriod, ModuleFilterValue } from './types';
import { MODULES, MODULE_KEYS, VALID_MODULE_FILTERS, VALID_PERIODS } from './types';

export function isValidModule(value: string): value is LeaderboardModule {
  return (MODULES as readonly string[]).includes(value);
}

export function isValidPeriod(value: string): value is LeaderboardPeriod {
  return (VALID_PERIODS as readonly string[]).includes(value);
}

export function isValidKey(module: LeaderboardModule, key: string): boolean {
  return (MODULE_KEYS[module] as readonly string[]).includes(key);
}

export function isValidModuleFilter(value: string): value is ModuleFilterValue {
  return (VALID_MODULE_FILTERS as readonly string[]).includes(value);
}

export function isValidPage(page: number): boolean {
  return Number.isInteger(page) && page >= 1;
}
