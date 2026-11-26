import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  isRankSlug,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";

const STORAGE_KEY = "DOJO_PASSED_EXAMS";

/**
 * The dojo exams passed on this device, by rank.
 *
 * @description
 * Kept on the device only: the server grants ranks from its own records,
 * and the exams are the app's stand-in for requirements the server judges
 * differently (see `exams.ts`), so there is nothing for it to record yet.
 * Read once at start-up and held in memory; a pass is written through.
 */
let passed: ReadonlySet<RankSlug> = new Set();
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      passed = new Set([...passed, ...parsed.filter(isRankSlug)]);
      emit();
    }
  } catch {
    // An unreadable record reads as no exam passed; the next pass rewrites it.
  }
}

export async function recordPassedExam(rank: RankSlug): Promise<void> {
  await load();
  if (passed.has(rank)) return;
  passed = new Set([...passed, rank]);
  emit();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...passed]));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void load();
  return () => {
    listeners.delete(listener);
  };
}

export function usePassedExams(): ReadonlySet<RankSlug> {
  return useSyncExternalStore(subscribe, () => passed);
}
