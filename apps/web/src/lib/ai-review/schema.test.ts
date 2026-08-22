import { describe, expect, it } from 'vitest';

import { buildAiReviewContentSchema, buildAiReviewJsonSchema } from './schema';

/**
 * The provider-facing JSON Schema and the server-side zod schema describe the
 * same response, and are deliberately NOT the same object: the JSON Schema is
 * looser, because strict mode cannot express the length bounds zod applies on
 * the way back in. See the module TSDoc.
 *
 * What they must never disagree about is which fields exist. The JSON Schema
 * sets `additionalProperties: false`, so a field added to `AiReviewContent`
 * and to zod but not here is not merely unvalidated — the provider is
 * forbidden from emitting it, and the feature silently ships without it.
 * Deriving one from the other would erase the intended difference in
 * strictness, so this pins the field sets instead.
 */
const PLIES = [4, 12, 21];

function zodKeys(shape: Record<string, unknown>): string[] {
  return Object.keys(shape).sort();
}

describe('AI review schemas', () => {
  const json = buildAiReviewJsonSchema(PLIES) as {
    required: string[];
    properties: Record<string, { properties?: Record<string, unknown>; required?: string[] }>;
  };
  const zodShape = buildAiReviewContentSchema(PLIES).shape;

  it('agrees on the top-level fields', () => {
    expect(zodKeys(json.properties)).toEqual(zodKeys(zodShape));
  });

  it('requires every top-level field on the provider side', () => {
    expect([...json.required].sort()).toEqual(zodKeys(zodShape));
  });

  it('agrees on the fields of a moment comment', () => {
    const jsonMoment = (
      json.properties.momentComments as unknown as {
        items: { properties: Record<string, unknown>; required: string[] };
      }
    ).items;
    const zodMoment = zodShape.momentComments.element.shape;

    expect(zodKeys(jsonMoment.properties)).toEqual(zodKeys(zodMoment));
    expect([...jsonMoment.required].sort()).toEqual(zodKeys(zodMoment));
  });

  it('pins ply to the supplied moments on both sides', () => {
    const jsonPly = (
      json.properties.momentComments as unknown as {
        items: { properties: { ply: { enum?: number[] } } };
      }
    ).items.properties.ply;
    expect(jsonPly.enum).toEqual(PLIES);

    const parsed = buildAiReviewContentSchema(PLIES).safeParse({
      summary: ['x'],
      momentComments: [{ ply: 99, explanation: 'x', lesson: 'x', principle: 'other' }],
      strengths: ['x'],
      weaknesses: ['x'],
      advice: ['x'],
    });
    expect(parsed.success).toBe(false);
  });

  it('pins principle to the catalogue on both sides', () => {
    const jsonPrinciple = (
      json.properties.momentComments as unknown as {
        items: { properties: { principle: { enum?: string[] } } };
      }
    ).items.properties.principle;
    expect(jsonPrinciple.enum).toContain('develop_before_attacking');

    const parsed = buildAiReviewContentSchema(PLIES).safeParse({
      summary: ['x'],
      momentComments: [{ ply: 4, explanation: 'x', lesson: 'x', principle: 'be_awesome' }],
      strengths: ['x'],
      weaknesses: ['x'],
      advice: ['x'],
    });
    expect(parsed.success).toBe(false);
  });
});
