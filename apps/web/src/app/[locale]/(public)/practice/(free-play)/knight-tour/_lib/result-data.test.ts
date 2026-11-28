import { describe, expect, it } from 'vitest';

import { parseKnightTourResult, parseKnightTourSettings } from './result-data';

// The tour page puts the JSON straight into URLSearchParams, which encodes it once.
const asParam = (value: unknown) =>
  new URLSearchParams({ data: JSON.stringify(value) }).get('data');

const tour = {
  visitedSquares: [
    ['a1', 1],
    ['b3', 2],
    ['c1', 3],
  ],
  lastSquare: 'c1',
  success: false,
  isClosedTour: false,
};

const empty = {
  visitedSquares: new Map(),
  lastSquare: '',
  success: false,
  isClosedTour: false,
};

describe('parseKnightTourResult', () => {
  it('restores the tour the session writes', () => {
    expect(parseKnightTourResult(asParam(tour))).toEqual({
      visitedSquares: new Map([
        ['a1', 1],
        ['b3', 2],
        ['c1', 3],
      ]),
      lastSquare: 'c1',
      success: false,
      isClosedTour: false,
    });
  });

  it.each([null, '', 'not-json', '%E0%A4%A'])(
    'is the empty result for absent or undecodable data: %j',
    (data) => {
      expect(parseKnightTourResult(data)).toEqual(empty);
    }
  );

  it.each([null, 42, 'text', [tour]])(
    'is the empty result when the payload is not an object: %j',
    (value) => {
      expect(parseKnightTourResult(asParam(value))).toEqual(empty);
    }
  );

  it.each([
    ['visitedSquares is missing', { ...tour, visitedSquares: undefined }],
    ['visitedSquares is not an array', { ...tour, visitedSquares: 5 }],
    ['an entry is not a pair', { ...tour, visitedSquares: [['a1', 1], 'b3'] }],
    ['an entry names no square', { ...tour, visitedSquares: [['z9', 1]] }],
    ['an entry has no move number', { ...tour, visitedSquares: [['a1', '1']] }],
    ['lastSquare is not a square', { ...tour, lastSquare: { square: 'c1' } }],
    ['success is missing', { ...tour, success: undefined }],
    ['isClosedTour is not a boolean', { ...tour, isClosedTour: 'no' }],
  ])('is the empty result when %s', (_label, value) => {
    expect(parseKnightTourResult(asParam(value))).toEqual(empty);
  });

  it('returns a separate map each time, so one caller cannot change another', () => {
    expect(parseKnightTourResult(null).visitedSquares).not.toBe(
      parseKnightTourResult(null).visitedSquares
    );
  });
});

describe('parseKnightTourSettings', () => {
  it('restores the settings the session writes', () => {
    expect(parseKnightTourSettings(asParam({ startingSquare: 'e4', blindfoldMode: true }))).toEqual(
      {
        startingSquare: 'e4',
        blindfoldMode: true,
      }
    );
  });

  it.each([null, '', 'not-json', asParam(null), asParam([]), asParam('e4')])(
    'is the defaults for an absent or unusable param: %j',
    (param) => {
      expect(parseKnightTourSettings(param)).toEqual({
        startingSquare: 'a1',
        blindfoldMode: false,
      });
    }
  );

  it('falls back field by field, keeping the setting that is valid', () => {
    expect(parseKnightTourSettings(asParam({ startingSquare: 'z9', blindfoldMode: true }))).toEqual(
      {
        startingSquare: 'a1',
        blindfoldMode: true,
      }
    );
    expect(parseKnightTourSettings(asParam({ startingSquare: 'h8' }))).toEqual({
      startingSquare: 'h8',
      blindfoldMode: false,
    });
  });
});
