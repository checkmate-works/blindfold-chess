import type { Square } from "@blindfold-chess/types";

import { isJsonObject } from "../common/encoded-json";
import { isBoolean } from "../common/pick-valid-fields";
import { isValidSquare } from "../common/utils";
import { ROUTE_PLANNER_PIECES, type RoutePlannerProblemResult } from "./types";

const isSquare = (value: unknown): value is Square =>
  typeof value === "string" && isValidSquare(value);

const isSquarePath = (value: unknown): value is Square[] =>
  Array.isArray(value) && value.every(isSquare);

const isOptionalBoolean = (value: unknown): value is boolean | undefined =>
  value === undefined || isBoolean(value);

/**
 * Whether a decoded value has the shape of one {@link RoutePlannerProblemResult}.
 *
 * The result screens receive the problem list through their route params,
 * which a hand-edited or truncated link can fill with anything. The result
 * list reads `success` on every entry and spreads `userPath` when a row opens,
 * so an entry that fails this check is dropped rather than rendered.
 */
export function isRoutePlannerProblemResult(
  value: unknown,
): value is RoutePlannerProblemResult {
  return (
    isJsonObject(value) &&
    (ROUTE_PLANNER_PIECES as readonly unknown[]).includes(value.piece) &&
    isSquare(value.start) &&
    isSquare(value.end) &&
    isBoolean(value.success) &&
    isSquarePath(value.userPath) &&
    isSquarePath(value.shortestPath) &&
    isOptionalBoolean(value.skipped) &&
    isOptionalBoolean(value.timedOut)
  );
}
