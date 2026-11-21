import type { RandomSource } from "../common/utils";

/** Everything the server needs to run one challenge module. */
export type ChallengeModuleDefinition<TSettings, TQuestion, TAnswer> = {
  /** Validates client-supplied settings against the module's allowed values. */
  parseSettings: (raw: unknown) => TSettings | null;
  /** The leaderboard segment these settings play in. */
  leaderboardKey: (settings: TSettings) => string;
  /** The whole question list for one attempt, generated up front. */
  generateQuestions: (
    settings: TSettings,
    count: number,
    rng?: RandomSource,
  ) => TQuestion[];
  /**
   * Null only when the value is structurally broken (wrong type or shape).
   * A well-formed wrong answer parses and is graded incorrect.
   */
  parseAnswer: (raw: unknown) => TAnswer | null;
  grade: (question: TQuestion, answer: TAnswer) => boolean;
  /** Length of the feedback flash that follows an answer. */
  feedbackMs: (settings: TSettings, correct: boolean) => number;
  /** Mean thinking time per answer below which a run is not recorded. */
  minMeanThinkMs: number;
  /** How many questions one attempt is generated with. */
  maxQuestions: number;
};

/** One accepted answer, as stored on the attempt row. Times are server epoch ms. */
export type ChallengeAnswerRecord = {
  answer: unknown;
  correct: boolean;
  /** Server-measured thinking time for this answer. */
  thinkMs: number;
  receivedAt: number;
  /** Accumulated thinking time including this answer. */
  elapsedMs: number;
};

/** The mutable part of an attempt row. */
export type ChallengeAttemptState = {
  /** Index of the question awaiting an answer. */
  sequence: number;
  score: number;
  incorrectAnswers: number;
  /** Thinking time accumulated up to the last accepted answer. */
  elapsedMs: number;
  /** Server time from which the clock runs for the current question. */
  resumedAt: number;
  answers: ChallengeAnswerRecord[];
};

/** What the client gets back for one submitted answer. */
export type ChallengeAnswerResponse<TQuestion> =
  | {
      status: "accepted";
      correct: boolean;
      /** Accumulated thinking time at this answer; the client clock syncs to it. */
      elapsedMs: number;
      /** Server processing beyond the feedback flash, excluded from thinking time. Omitted when zero. */
      feedbackExtensionMs?: number;
      /** Null when the attempt is over (mistake limit or no questions left). */
      next: { sequence: number; question: TQuestion } | null;
    }
  /** The time limit had already passed on the server; the answer was not counted. */
  | { status: "expired" }
  /** Not accepted: stale sequence, sent during the feedback flash, unknown attempt. */
  | { status: "rejected" };

/** How a session hook talks to the server when the server runs the attempt. */
export type RemoteChallengePort<TQuestion> = {
  first: { sequence: number; question: TQuestion };
  submitAnswer: (
    sequence: number,
    answer: unknown,
  ) => Promise<ChallengeAnswerResponse<TQuestion>>;
};

export type ChallengeAnswerDecision<TQuestion> =
  | { kind: "replay"; response: ChallengeAnswerResponse<TQuestion> }
  | { kind: "rejected" }
  | { kind: "expired" }
  | {
      kind: "accepted";
      state: ChallengeAttemptState;
      response: ChallengeAnswerResponse<TQuestion>;
    };

export type ChallengeFinishDecision =
  | { kind: "pending"; remainingMs: number }
  | { kind: "rejected" }
  | { kind: "unrecorded" }
  | { kind: "refused"; reason: "implausible_speed" }
  | {
      kind: "recorded";
      score: number;
      incorrectAnswers: number;
      timeTaken: number;
    };
