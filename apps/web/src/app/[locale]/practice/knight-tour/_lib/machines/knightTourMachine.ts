import { assign, setup } from 'xstate';

import { getRandomSquare, isTourComplete, isValidKnightMove } from '../utils';
import type { KnightTourContext, KnightTourEvent, KnightTourInput } from './types';

export const knightTourMachine = setup({
  types: {
    context: {} as KnightTourContext,
    events: {} as KnightTourEvent,
    input: {} as KnightTourInput,
  },
  actions: {
    initializeGame: assign(({ context }) => {
      const square =
        context.settings.startingSquareOption === 'random'
          ? getRandomSquare()
          : context.settings.startingSquareOption;
      return {
        startingSquare: square,
        currentSquare: square,
        visitedSquares: new Map([[square, 1]]),
        moveHistory: [square],
        isBlindfolded: context.settings.blindfoldMode,
      };
    }),
    makeMove: assign(({ context, event }) => {
      if (event.type !== 'MOVE') return {};
      const { targetSquare } = event;

      if (!isValidKnightMove(context.currentSquare, targetSquare)) return {};
      if (context.visitedSquares.has(targetSquare)) return {};

      const newMoveNumber = context.visitedSquares.size + 1;
      const newVisitedSquares = new Map(context.visitedSquares);
      newVisitedSquares.set(targetSquare, newMoveNumber);

      return {
        visitedSquares: newVisitedSquares,
        currentSquare: targetSquare,
        moveHistory: [...context.moveHistory, targetSquare],
      };
    }),
    undoMove: assign(({ context }) => {
      if (context.moveHistory.length <= 1) return {};

      const newHistory = [...context.moveHistory];
      newHistory.pop();
      const previousSquare = newHistory[newHistory.length - 1];

      const newVisitedSquares = new Map(context.visitedSquares);
      newVisitedSquares.delete(context.currentSquare);

      return {
        moveHistory: newHistory,
        currentSquare: previousSquare,
        visitedSquares: newVisitedSquares,
      };
    }),
    openQuitModal: assign({
      showQuitModal: true,
    }),
    closeQuitModal: assign({
      showQuitModal: false,
    }),
    resetGame: assign({
      visitedSquares: new Map<string, number>(),
      moveHistory: [] as string[],
      currentSquare: '',
      startingSquare: '',
      isBlindfolded: false,
    }),
    updateSettings: assign(({ context, event }) => {
      if (event.type !== 'UPDATE_SETTINGS') return {};
      return {
        settings: { ...context.settings, ...event.settings },
      };
    }),
  },
  guards: {
    isTourComplete: ({ context }) => isTourComplete(context.visitedSquares),
    canUndo: ({ context }) => context.moveHistory.length > 1,
    isValidMove: ({ context, event }) => {
      if (event.type !== 'MOVE') return false;
      return (
        isValidKnightMove(context.currentSquare, event.targetSquare) &&
        !context.visitedSquares.has(event.targetSquare)
      );
    },
  },
}).createMachine({
  id: 'knightTour',
  initial: 'setup',
  context: ({ input }) => ({
    mode: input.mode,
    settings: input.settings,
    startingSquare: '',
    currentSquare: '',
    visitedSquares: new Map(),
    moveHistory: [],
    isBlindfolded: false,
    showQuitModal: false,
  }),
  states: {
    setup: {
      on: {
        START_GAME: {
          target: 'playing',
          actions: ['initializeGame'],
        },
        UPDATE_SETTINGS: {
          actions: ['updateSettings'],
        },
      },
    },
    playing: {
      always: {
        guard: 'isTourComplete',
        target: 'finished',
      },
      on: {
        MOVE: {
          guard: 'isValidMove',
          actions: ['makeMove'],
        },
        UNDO: {
          guard: 'canUndo',
          actions: ['undoMove'],
        },
        OPEN_QUIT_MODAL: {
          actions: ['openQuitModal'],
        },
        CANCEL_QUIT: {
          actions: ['closeQuitModal'],
        },
        CONFIRM_QUIT: {
          target: 'finished',
          actions: ['closeQuitModal'],
        },
      },
    },
    finished: {
      on: {
        PLAY_AGAIN: {
          target: 'setup',
          actions: ['resetGame'],
        },
      },
    },
  },
});

export type KnightTourMachine = typeof knightTourMachine;
