'use client';

import { useLocalStorageSettings } from '@/lib/persistent-settings/use-local-storage-settings';

import type { BoardOrientation, FeedbackSpeed } from '../_lib/types';

export type CoordinateQuizSettings = {
  boardOrientation: BoardOrientation;
  feedbackSpeed: FeedbackSpeed;
};

const STORAGE_KEY = 'coordinateQuiz_settings';

const DEFAULTS: CoordinateQuizSettings = {
  boardOrientation: 'white',
  feedbackSpeed: 'normal',
};

/**
 * The board orientation and feedback speed, shared by every screen that can
 * change them — the module top and the challenge setup.
 *
 * The settings deliberately do not live in the URL. A query parameter is
 * written only by the screen that starts a session, so every navigation that
 * does not rebuild it reverts the player to a white board at normal speed
 * without saying so: quitting a session lands back on
 * `coordinate-quiz/challenge` with a bare URL, and the setup screen there used
 * to seed its state from those missing parameters. Storage survives those
 * hops, so the setup screens read it and the query keeps the one job it can do
 * honestly — carrying the choices into a session that is already starting.
 */
export function useCoordinateQuizSettings() {
  return useLocalStorageSettings(STORAGE_KEY, DEFAULTS);
}
