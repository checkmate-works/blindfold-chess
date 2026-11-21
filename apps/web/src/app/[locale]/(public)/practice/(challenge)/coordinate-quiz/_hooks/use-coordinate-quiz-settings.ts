'use client';

import { oneOf } from '@blindfold-chess/features/common';

import { useLocalStorageSettings } from '@/lib/persistent-settings/use-local-storage-settings';

import { BOARD_ORIENTATIONS, type BoardOrientation } from '../_lib/types';

export type CoordinateQuizSettings = {
  boardOrientation: BoardOrientation;
};

const STORAGE_KEY = 'coordinateQuiz_settings';

const DEFAULTS: CoordinateQuizSettings = {
  boardOrientation: 'white',
};

const GUARDS = {
  boardOrientation: oneOf(BOARD_ORIENTATIONS),
};

/**
 * The board orientation, shared by every screen that can change it — the
 * module top and the challenge setup.
 *
 * Values stored before the feedback speed was removed still carry a
 * `feedbackSpeed`. It has no guard here, so it is skipped on load and dropped
 * from storage with the player's next change.
 *
 * The settings deliberately do not live in the URL. A query parameter is
 * written only by the screen that starts a session, so every navigation that
 * does not rebuild it reverts the player to a white board
 * without saying so: quitting a session lands back on
 * `coordinate-quiz/challenge` with a bare URL, and the setup screen there used
 * to seed its state from those missing parameters. Storage survives those
 * hops, so the setup screens read it and the query keeps the one job it can do
 * honestly — carrying the choice into a session that is already starting.
 *
 * A link can still choose the setting the challenge setup opens with — the
 * leaderboard's challenge button does — through `useQuerySeededSettings`,
 * which writes that choice into storage rather than reading it alongside.
 */
export function useCoordinateQuizSettings() {
  return useLocalStorageSettings(STORAGE_KEY, DEFAULTS, GUARDS);
}
