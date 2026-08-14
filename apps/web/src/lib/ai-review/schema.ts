import { z } from 'zod';

import { MAX_REVIEW_MOMENTS } from './input';
import type { AiReviewContent } from './types';

/**
 * Output contract for the LLM — the structural half of the "LLM is not an
 * engine" guarantee. The schema contains ONLY prose fields plus a `ply`
 * back-reference constrained to the moments we supplied; there is nowhere to
 * emit an evaluation, a severity, or a move.
 *
 * Two layers on purpose:
 * - {@link buildAiReviewJsonSchema} is sent to the provider (strict mode), so
 *   a conforming response is enforced at generation time — including the
 *   per-game `ply` enum.
 * - {@link buildAiReviewContentSchema} (zod) re-validates the parsed response
 *   server-side, adding the bounds strict JSON Schema cannot express
 *   (min/max lengths) and trimming. Never trust the provider's enforcement
 *   alone.
 */

const MAX_SUMMARY_LENGTH = 2000;
const MAX_ITEM_LENGTH = 1000;

/** Provider-facing strict JSON Schema, with `ply` pinned to this game's moments. */
export function buildAiReviewJsonSchema(allowedPlies: number[]): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'momentComments', 'strengths', 'weaknesses', 'advice'],
    properties: {
      summary: { type: 'string' },
      momentComments: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['ply', 'explanation', 'lesson'],
          properties: {
            ply:
              allowedPlies.length > 0
                ? { type: 'integer', enum: allowedPlies }
                : { type: 'integer' },
            explanation: { type: 'string' },
            lesson: { type: 'string' },
          },
        },
      },
      strengths: { type: 'array', items: { type: 'string' } },
      weaknesses: { type: 'array', items: { type: 'string' } },
      advice: { type: 'array', items: { type: 'string' } },
    },
  };
}

const prose = (max: number) => z.string().trim().min(1).max(max);

/** Server-side re-validation of the parsed LLM response. */
export function buildAiReviewContentSchema(allowedPlies: number[]) {
  const allowed = new Set(allowedPlies);
  return z.object({
    summary: prose(MAX_SUMMARY_LENGTH),
    momentComments: z
      .array(
        z.object({
          ply: z
            .number()
            .int()
            .refine((p) => allowed.has(p), 'ply not among the provided moments'),
          explanation: prose(MAX_ITEM_LENGTH),
          lesson: prose(MAX_ITEM_LENGTH),
        })
      )
      .max(MAX_REVIEW_MOMENTS),
    strengths: z.array(prose(MAX_ITEM_LENGTH)).min(1).max(4),
    weaknesses: z.array(prose(MAX_ITEM_LENGTH)).min(1).max(4),
    advice: z.array(prose(MAX_ITEM_LENGTH)).min(1).max(3),
  }) satisfies z.ZodType<AiReviewContent>;
}
