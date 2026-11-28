import type { ChallengeRecord } from "@blindfold-chess/features/challenge-records";
import {
  CHALLENGE_MENU_TYPES,
  MODULE_TO_SLUG,
  type ChallengeMenuType,
} from "@blindfold-chess/features/practice-registry";
import {
  type DatePeriod,
  getPeriodRange,
  getPreviousPeriodRange,
} from "@blindfold-chess/features/utils";

import { callMobileApi, type ApiFailure } from "../../auth/api-client";

export const RANK_PERIODS = ["all-time", "weekly", "monthly"] as const;
export type RankPeriod = (typeof RANK_PERIODS)[number];

/** One of the user's own leaderboard positions. */
export type OwnRank = {
  /** Registry module (`square_colors`, …). */
  module: string;
  /** The leaderboard within the module (`default`, `white`, `knight`, …). */
  key: string;
  rank: number;
};

export async function fetchOwnRanks(
  period: RankPeriod,
): Promise<OwnRank[] | { error: ApiFailure | "serverError" }> {
  const response = await callMobileApi(`/leaderboard/ranks?period=${period}`);
  if (typeof response === "string") return { error: response };
  if (!response.ok) return { error: "serverError" };
  const body = (await response.json().catch(() => undefined)) as
    { ranks?: unknown } | undefined;
  if (!Array.isArray(body?.ranks)) return { error: "serverError" };
  return body.ranks.filter(
    (r): r is OwnRank =>
      typeof r === "object" &&
      r !== null &&
      typeof (r as OwnRank).module === "string" &&
      typeof (r as OwnRank).key === "string" &&
      typeof (r as OwnRank).rank === "number",
  );
}

/** The practice slug (`square-colors`) of a registry module, if any. */
export function slugOfModule(module: string): string | undefined {
  return (MODULE_TO_SLUG as Record<string, string>)[module];
}

type Failure = { error: ApiFailure | "serverError" };

function asMenu(value: unknown): ChallengeMenuType | null {
  return CHALLENGE_MENU_TYPES.find((m) => m === value) ?? null;
}

function asMenus(value: unknown): ChallengeMenuType[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((v) => asMenu(v) ?? []);
}

/**
 * One result from the API, with `createdAt` parsed back into a `Date`; null
 * when a field is missing or of the wrong type.
 */
function asRecord(value: unknown): ChallengeRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const r = value as Record<string, unknown>;
  const createdAt =
    typeof r.createdAt === "string" ? new Date(r.createdAt) : undefined;
  if (
    typeof r.id !== "string" ||
    typeof r.menuType !== "string" ||
    typeof r.leaderboardKey !== "string" ||
    typeof r.score !== "number" ||
    typeof r.incorrectAnswers !== "number" ||
    typeof r.timeTaken !== "number" ||
    !createdAt ||
    Number.isNaN(createdAt.getTime())
  ) {
    return null;
  }
  return {
    id: r.id,
    menuType: r.menuType,
    leaderboardKey: r.leaderboardKey,
    score: r.score,
    incorrectAnswers: r.incorrectAnswers,
    timeTaken: r.timeTaken,
    createdAt,
  };
}

function asRecords(value: unknown): ChallengeRecord[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((v) => asRecord(v) ?? []);
}

/** The JSON body of a GET, or the failure in its place. */
async function getJson(
  path: string,
): Promise<Record<string, unknown> | Failure> {
  const response = await callMobileApi(path);
  if (typeof response === "string") return { error: response };
  if (!response.ok) return { error: "serverError" };
  const body: unknown = await response.json().catch(() => undefined);
  return typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : { error: "serverError" };
}

function isFailure(body: object): body is Failure {
  return "error" in body;
}

/** The dashboard for one period, as the web's My Records loads it. */
export type RecordsDashboard = {
  /** Menus with at least one result in the period, in the registry's order. */
  availableMenuTypes: ChallengeMenuType[];
  /** The menu `sessions` belong to: the preferred one when it has results. */
  selectedMenu: ChallengeMenuType | null;
  sessions: ChallengeRecord[];
  /** The same menu's results in the period before, for the comparisons. */
  previousSessions: ChallengeRecord[];
};

/**
 * The user's results of `period` (and of the period before it) for
 * `preferredMenu`. The period's edges are taken on the phone, in its own
 * timezone, as the web takes them in the browser's.
 */
export async function fetchRecordsDashboard(
  period: DatePeriod,
  preferredMenu: ChallengeMenuType | null,
): Promise<RecordsDashboard | Failure> {
  const current = getPeriodRange(period);
  const previous = getPreviousPeriodRange(period);
  const query = new URLSearchParams({
    currentStart: current.start.toISOString(),
    currentEnd: current.end.toISOString(),
    previousStart: previous.start.toISOString(),
    previousEnd: previous.end.toISOString(),
  });
  if (preferredMenu) query.set("menu", preferredMenu);

  const body = await getJson(`/records/dashboard?${query.toString()}`);
  if (isFailure(body)) return body;
  const availableMenuTypes = asMenus(body.availableMenuTypes);
  const sessions = asRecords(body.sessions);
  const previousSessions = asRecords(body.previousSessions);
  if (!availableMenuTypes || !sessions || !previousSessions) {
    return { error: "serverError" };
  }
  return {
    availableMenuTypes,
    selectedMenu: asMenu(body.selectedMenu),
    sessions,
    previousSessions,
  };
}

/** One page of the full results list, as the web's results page shows it. */
export type RecordsResultsPage = {
  items: ChallengeRecord[];
  page: number;
  totalPages: number;
  /** The menu listed, or null for every menu. */
  menu: ChallengeMenuType | null;
  /** The key listed: the most recent one for a keyed menu asked with none. */
  key: string | null;
  /** Every menu the user has results for, all time. */
  availableMenuTypes: ChallengeMenuType[];
};

export async function fetchRecordsResults(params: {
  page: number;
  menu: ChallengeMenuType | null;
  key: string | null;
}): Promise<RecordsResultsPage | Failure> {
  const query = new URLSearchParams({ page: String(params.page) });
  if (params.menu) {
    query.set("menu", params.menu);
    if (params.key) query.set("key", params.key);
  }
  const body = await getJson(`/records/results?${query.toString()}`);
  if (isFailure(body)) return body;
  const items = asRecords(body.items);
  const availableMenuTypes = asMenus(body.availableMenuTypes);
  if (
    !items ||
    !availableMenuTypes ||
    typeof body.page !== "number" ||
    typeof body.totalPages !== "number"
  ) {
    return { error: "serverError" };
  }
  return {
    items,
    page: body.page,
    totalPages: body.totalPages,
    menu: asMenu(body.menu),
    key: typeof body.key === "string" ? body.key : null,
    availableMenuTypes,
  };
}
