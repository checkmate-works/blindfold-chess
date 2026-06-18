import { describe, expect, it } from 'vitest';

import { startRetentionRun } from './retention-run';

const NOW = new Date('2026-06-19T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('startRetentionRun', () => {
  it('derives the cutoff as now − retentionMs and snapshots startedAt', () => {
    const run = startRetentionRun({ now: NOW, retentionMs: 30 * DAY_MS });

    expect(run.startedAt.toISOString()).toBe(NOW.toISOString());
    expect(run.cutoff.toISOString()).toBe(new Date(NOW.getTime() - 30 * DAY_MS).toISOString());
  });

  it('is never over budget when no budgetMs is given', () => {
    const run = startRetentionRun({ now: NOW, retentionMs: DAY_MS });
    expect(run.isOverBudget()).toBe(false);
  });

  it('is immediately over budget when the budget is already spent', () => {
    // A non-positive budget puts the deadline at/just before the current instant.
    const run = startRetentionRun({ now: NOW, retentionMs: DAY_MS, budgetMs: -1 });
    expect(run.isOverBudget()).toBe(true);
  });

  it('is within budget when the budget comfortably covers the run', () => {
    const run = startRetentionRun({ now: NOW, retentionMs: DAY_MS, budgetMs: 60_000 });
    expect(run.isOverBudget()).toBe(false);
  });

  it('stamps the report with ISO startedAt and a finishedAt at call time', () => {
    const run = startRetentionRun({ now: NOW, retentionMs: DAY_MS });
    const stamps = run.stamps();

    expect(stamps.startedAt).toBe(NOW.toISOString());
    // finishedAt is the real wall clock at stamp time (not the injected `now`),
    // so assert only that it is a valid, round-trippable ISO instant.
    expect(new Date(stamps.finishedAt).toISOString()).toBe(stamps.finishedAt);
    expect(Number.isNaN(new Date(stamps.finishedAt).getTime())).toBe(false);
  });
});
