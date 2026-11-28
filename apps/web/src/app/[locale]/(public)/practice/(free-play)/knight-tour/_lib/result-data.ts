import {
  type FieldGuard,
  isBoolean,
  isFiniteNumber,
  isJsonObject,
  isValidSquare,
  parseEncodedJson,
  pickValidFields,
} from '@blindfold-chess/features/common';

/** A finished tour, as the result page shows it. */
export type KnightTourResultData = {
  /** Each visited square and the move number it was reached on. */
  visitedSquares: Map<string, number>;
  lastSquare: string;
  success: boolean;
  isClosedTour: boolean;
};

/** The settings the tour ran with, so "Play again" can start the same one. */
export type KnightTourResultSettings = {
  startingSquare: string;
  blindfoldMode: boolean;
};

/** A fresh value each call, so no caller can mutate a shared map. */
const emptyResult = (): KnightTourResultData => ({
  visitedSquares: new Map(),
  lastSquare: '',
  success: false,
  isClosedTour: false,
});

const DEFAULT_SETTINGS: KnightTourResultSettings = {
  startingSquare: 'a1',
  blindfoldMode: false,
};

const isSquare: FieldGuard<string> = (value): value is string =>
  typeof value === 'string' && isValidSquare(value);

const isVisitedEntry = (value: unknown): value is [string, number] =>
  Array.isArray(value) && value.length === 2 && isSquare(value[0]) && isFiniteNumber(value[1]);

/**
 * The tour back from the `data` param (`visitedSquares` travels as the
 * entries of its map).
 *
 * The param arrives through the URL, so anything can be in it. A result is
 * judged as a whole — a tour with only some of its fields is not one the
 * player finished — so any missing or malformed field yields the empty
 * result the page shows for an absent param.
 */
export function parseKnightTourResult(dataParam: string | null): KnightTourResultData {
  const parsed = parseEncodedJson(dataParam);
  if (
    !isJsonObject(parsed) ||
    !Array.isArray(parsed.visitedSquares) ||
    !parsed.visitedSquares.every(isVisitedEntry) ||
    !isSquare(parsed.lastSquare) ||
    !isBoolean(parsed.success) ||
    !isBoolean(parsed.isClosedTour)
  ) {
    return emptyResult();
  }
  return {
    visitedSquares: new Map(parsed.visitedSquares),
    lastSquare: parsed.lastSquare,
    success: parsed.success,
    isClosedTour: parsed.isClosedTour,
  };
}

/**
 * The settings back from the `settings` param. Unlike the result, each
 * setting is independent, so a malformed one falls back to its default and
 * the other is kept.
 */
export function parseKnightTourSettings(settingsParam: string | null): KnightTourResultSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...pickValidFields<KnightTourResultSettings>(parseEncodedJson(settingsParam), {
      startingSquare: isSquare,
      blindfoldMode: isBoolean,
    }),
  };
}
