/**
 * Exp (experience point) information returned after a challenge result is saved.
 * Shared between server-side save logic and client-side display components.
 */
export type ExpInfo = {
  earnedExp: number;
  totalExp: number;
  level: number;
  levelUp: boolean;
};
