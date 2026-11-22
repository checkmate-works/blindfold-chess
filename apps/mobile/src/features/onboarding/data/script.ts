/**
 * Where the onboarding chat sends the player when it ends: a confident
 * player straight into a game against the AI, everyone else into an untimed
 * first practice. The route each one opens is in `app/onboarding.tsx`.
 */
export type OnboardingDestination = "ai-game" | "practice";

/**
 * One line of the mentor's script.
 *
 * - `statement` — the mentor says it and goes straight on to `nextId`; the
 *   player taps nothing.
 * - `question` — the mentor asks, the player picks one of `choices`, and
 *   the choice decides the next step.
 * - `finish` — the last line, with a button (`ctaKey`) that ends onboarding
 *   and opens `destination`.
 */
export type ScriptStep =
  | { id: string; type: "statement"; textKey: string; nextId: string }
  | {
      id: string;
      type: "question";
      textKey: string;
      choices: { labelKey: string; nextId: string }[];
    }
  | {
      id: string;
      type: "finish";
      textKey: string;
      ctaKey: string;
      destination: OnboardingDestination;
    };

export const ONBOARDING_START_ID = "start";

export const ONBOARDING_SCRIPT: Record<string, ScriptStep> = {
  start: {
    id: "start",
    type: "statement",
    textKey: "onboarding.script.greeting",
    nextId: "intro",
  },
  intro: {
    id: "intro",
    type: "statement",
    textKey: "onboarding.script.introduction",
    nextId: "confidence_check",
  },
  // Three answers rather than yes/no: a strong player who has never played
  // blindfold is the common case, and dropping them into a blindfold game
  // first would be a poor first experience. Only "I can play blindfold"
  // goes to the AI.
  confidence_check: {
    id: "confidence_check",
    type: "question",
    textKey: "onboarding.script.confidenceCheck",
    choices: [
      { labelKey: "onboarding.script.choiceBlindfold", nextId: "confident" },
      {
        labelKey: "onboarding.script.choiceWithBoard",
        nextId: "chess_player",
      },
      { labelKey: "onboarding.script.choiceNew", nextId: "beginner" },
    ],
  },
  confident: {
    id: "confident",
    type: "statement",
    textKey: "onboarding.script.confident",
    nextId: "finish_ai_game",
  },
  chess_player: {
    id: "chess_player",
    type: "statement",
    textKey: "onboarding.script.chessPlayer",
    nextId: "finish_practice",
  },
  beginner: {
    id: "beginner",
    type: "statement",
    textKey: "onboarding.script.beginner",
    nextId: "finish_practice",
  },
  finish_ai_game: {
    id: "finish_ai_game",
    type: "finish",
    textKey: "onboarding.script.readyAiGame",
    ctaKey: "onboarding.startAiGame",
    destination: "ai-game",
  },
  finish_practice: {
    id: "finish_practice",
    type: "finish",
    textKey: "onboarding.script.readyPractice",
    ctaKey: "onboarding.startPractice",
    destination: "practice",
  },
};
