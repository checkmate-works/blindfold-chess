import { assign, setup } from 'xstate';

import type { PositionData } from '../types';
import type { PositionMemoryContext, PositionMemoryEvent, PositionMemoryInput } from './types';

const EMPTY_POSITION = '8/8/8/8/8/8/8/8 w - - 0 1';

export const positionMemoryMachine = setup({
  types: {
    context: {} as PositionMemoryContext,
    events: {} as PositionMemoryEvent,
    input: {} as PositionMemoryInput,
  },
  actions: {
    setPositions: assign({
      positions: (_, params: { positions: PositionData[] }) => params.positions,
    }),
    resetForNextProblem: assign(({ context }) => ({
      currentProblemIndex: context.currentProblemIndex + 1,
      memorizeTimeLeft: context.timeLimit,
      recreatedPosition: EMPTY_POSITION,
      currentAccuracy: null,
    })),
    decrementTimer: assign({
      memorizeTimeLeft: ({ context }) => Math.max(0, context.memorizeTimeLeft - 1),
    }),
    updateRecreatedPosition: assign({
      recreatedPosition: (_, params: { fen: string }) => params.fen,
    }),
    saveResult: assign({
      currentAccuracy: (_, params: { accuracy: PositionMemoryContext['currentAccuracy'] }) =>
        params.accuracy,
      problemResults: (
        { context },
        params: { accuracy: PositionMemoryContext['currentAccuracy'] }
      ) => {
        const newResults = new Map(context.problemResults);
        if (params.accuracy) {
          newResults.set(context.currentProblemIndex, params.accuracy);
        }
        return newResults;
      },
      recreatedPositions: ({ context }) => {
        const newPositions = new Map(context.recreatedPositions);
        newPositions.set(context.currentProblemIndex, context.recreatedPosition);
        return newPositions;
      },
      // Accumulate piece-level mistakes from this submission. The guard
      // against `params.accuracy === null` mirrors the problemResults branch
      // — a SUBMIT without an accuracy payload contributes zero.
      totalMistakes: (
        { context },
        params: { accuracy: PositionMemoryContext['currentAccuracy'] }
      ) => {
        if (!params.accuracy) return context.totalMistakes;
        const delta =
          params.accuracy.incorrectPieces +
          params.accuracy.missingPieces +
          params.accuracy.extraPieces;
        return context.totalMistakes + delta;
      },
    }),
    markAsSkipped: assign({
      skippedProblems: ({ context }) => {
        const newSkipped = new Set(context.skippedProblems);
        newSkipped.add(context.currentProblemIndex);
        return newSkipped;
      },
    }),
    openQuitModal: assign({
      showQuitModal: true,
    }),
    closeQuitModal: assign({
      showQuitModal: false,
    }),
    resetForViewAgain: assign(({ context }) => ({
      memorizeTimeLeft: context.timeLimit,
    })),
    prepareForRecreate: assign({
      recreatedPosition: EMPTY_POSITION,
    }),
  },
  guards: {
    hasMoreProblems: ({ context }) => context.currentProblemIndex + 1 < context.positions.length,
    timerExpired: ({ context }) => context.memorizeTimeLeft === 0,
  },
}).createMachine({
  id: 'positionMemory',
  initial: 'memorize',
  context: ({ input }) => ({
    mode: input.mode,
    positions: input.positions,
    timeLimit: input.timeLimit,
    currentProblemIndex: 0,
    recreatedPosition: EMPTY_POSITION,
    memorizeTimeLeft: input.timeLimit,
    currentAccuracy: null,
    problemResults: new Map(),
    recreatedPositions: new Map(),
    skippedProblems: new Set(),
    showQuitModal: false,
    totalMistakes: 0,
  }),
  on: {
    SET_POSITIONS: {
      actions: [
        {
          type: 'setPositions',
          params: ({ event }) => ({ positions: event.positions }),
        },
      ],
    },
  },
  states: {
    memorize: {
      on: {
        MEMORIZED: {
          target: 'recreate',
          actions: ['prepareForRecreate'],
        },
        TICK: [
          {
            guard: 'timerExpired',
            target: 'recreate',
            actions: ['prepareForRecreate'],
          },
          {
            actions: ['decrementTimer'],
          },
        ],
        SKIP: [
          {
            guard: 'hasMoreProblems',
            target: 'memorize',
            actions: ['markAsSkipped', 'resetForNextProblem'],
            reenter: true,
          },
          {
            target: 'sessionResult',
            actions: ['markAsSkipped'],
          },
        ],
        OPEN_QUIT_MODAL: {
          actions: ['openQuitModal'],
        },
        CANCEL_QUIT: {
          actions: ['closeQuitModal'],
        },
        CONFIRM_QUIT: {
          target: 'sessionResult',
          actions: ['closeQuitModal'],
        },
      },
    },
    recreate: {
      on: {
        UPDATE_POSITION: {
          actions: [
            {
              type: 'updateRecreatedPosition',
              params: ({ event }) => ({ fen: event.fen }),
            },
          ],
        },
        SUBMIT: {
          target: 'problemResult',
          actions: [
            {
              type: 'saveResult',
              params: ({ event }) => ({ accuracy: event.accuracy }),
            },
          ],
        },
        VIEW_AGAIN: {
          target: 'memorize',
          actions: ['resetForViewAgain'],
        },
        SKIP: [
          {
            guard: 'hasMoreProblems',
            target: 'memorize',
            actions: ['markAsSkipped', 'resetForNextProblem'],
          },
          {
            target: 'sessionResult',
            actions: ['markAsSkipped'],
          },
        ],
        OPEN_QUIT_MODAL: {
          actions: ['openQuitModal'],
        },
        CANCEL_QUIT: {
          actions: ['closeQuitModal'],
        },
        CONFIRM_QUIT: {
          target: 'sessionResult',
          actions: ['closeQuitModal'],
        },
      },
    },
    problemResult: {
      on: {
        NEXT_PROBLEM: {
          guard: 'hasMoreProblems',
          target: 'memorize',
          actions: ['resetForNextProblem'],
        },
        VIEW_RESULTS: {
          target: 'sessionResult',
        },
      },
    },
    sessionResult: {
      type: 'final',
    },
  },
});
