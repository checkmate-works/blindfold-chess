'use client';

import { useEffect, useState } from 'react';

import type { ExpInfo } from '@/lib/exp-types';

import { SESSION_STORAGE_KEYS } from '../_lib/session-storage-keys';

/**
 * Displays earned EXP, current level, and level progress bar on the practice result screen.
 * Reads exp data from sessionStorage (stored by useChallengeResultSave hook).
 * Renders nothing if no exp data is available (e.g., unauthenticated users).
 */
export function ExpGainDisplay() {
  const [expInfo, setExpInfo] = useState<ExpInfo | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEYS.EXP_RESULT);
    if (stored) {
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.EXP_RESULT);
      try {
        const parsed = JSON.parse(stored) as ExpInfo;
        if (parsed && typeof parsed.earnedExp === 'number') {
          setExpInfo(parsed);
        }
      } catch {
        // Invalid JSON — ignore
      }
    }
  }, []);

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
