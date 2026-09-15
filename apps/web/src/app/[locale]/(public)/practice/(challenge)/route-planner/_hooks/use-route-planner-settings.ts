'use client';

import { useLocalStorageSettings } from '@/lib/persistent-settings/use-local-storage-settings';

import type { RoutePlannerPieceSelection } from '../_lib/pieces';

export type RoutePlannerSettings = {
  pieceSelection: RoutePlannerPieceSelection;
};

const STORAGE_KEY = 'routePlannerSettings';

const DEFAULTS: RoutePlannerSettings = {
  pieceSelection: 'n',
};

/**
 * The piece the player routes with, shared by every screen that can change it
 * — the module top and the challenge setup.
 *
 * The setting deliberately does not live in the URL. A query parameter is
 * written only by the screen that starts a session, so every navigation that
 * does not rebuild it reverts the choice to the knight without saying so: the
 * tutorial's closing button and the training screen's challenge CTA both land
 * on `route-planner/challenge` with a bare URL, and the setup screen there
 * used to seed its state from that missing parameter. Storage survives those
 * hops, so the setup screens read it and the query keeps the one job it can do
 * honestly — carrying the piece into a session that is already starting.
 */
export function useRoutePlannerSettings() {
  return useLocalStorageSettings(STORAGE_KEY, DEFAULTS);
}
