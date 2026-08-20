import 'server-only';

import type { LlmClient, LlmCompletionRequest } from './llm-client';

/**
 * OpenAI adapter for the {@link LlmClient} port, via the Chat Completions
 * endpoint with strict `json_schema` response formatting.
 *
 * @design fetch, not the openai SDK
 * The integration is a single POST with a JSON body and a JSON response —
 * the SDK would add a dependency solely to type one call, and would couple
 * the port's shape to SDK types. Mirrors the repo's posture of keeping
 * external services behind thin, replaceable adapters.
 *
 * @design Env access mirrors `@/lib/billing/stripe.ts`
 * Read lazily at call time (never at module load, which would break builds
 * without the key) and only ever on the server (`server-only` guard).
 */

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Cheapest model with reliable multi-language coaching prose. Override with
 * `OPENAI_MODEL` to re-tune cost/quality without a code change.
 */
const DEFAULT_MODEL = 'gpt-5-mini';

function requireApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return key;
}

/**
 * Whether an LLM is reachable at all in this deployment.
 *
 * Callers use it to skip offering generation (hiding the tab, refusing before
 * the rate limit) rather than letting the request travel the whole pipeline —
 * a browser-side engine sweep and a rate-limit slot — only to fail at the
 * `requireApiKey()` throw. Deliberately mirrors that function's falsy test so
 * an empty string counts as unset in both places.
 */
export function isLlmConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/** Whether the model takes the `reasoning_effort` knob (gpt-5* / o* families). */
function isReasoningModel(model: string): boolean {
  return model.startsWith('gpt-5') || model.startsWith('o');
}

/**
 * @param model Which model to call. Defaults to `OPENAI_MODEL`, falling back
 *   to {@link DEFAULT_MODEL}. Taking it as a parameter keeps the pairing
 *   testable: {@link isReasoningModel} branches the request body on this
 *   value, so with the env read inline the same code emitted a different
 *   payload per deployment and no test could pin which.
 */
export function createOpenAiClient(
  model: string = process.env.OPENAI_MODEL || DEFAULT_MODEL
): LlmClient {
  return {
    model,
    async complete(request: LlmCompletionRequest): Promise<string> {
      const body: Record<string, unknown> = {
        model,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: request.schemaName, strict: true, schema: request.schema },
        },
        // Budget covers hidden reasoning tokens too on reasoning models, so
        // it is deliberately roomier than the visible output needs.
        max_completion_tokens: request.maxOutputTokens,
      };
      if (isReasoningModel(model)) {
        // Coach prose needs fluency, not deep search — keep the (billed)
        // reasoning overhead minimal.
        body.reasoning_effort = 'low';
      }

      const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${requireApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        // Log the provider's error body server-side; the thrown message stays
        // status-only so nothing provider-internal can reach a client.
        const errorBody = await response.text().catch(() => '');
        console.error('[ai-review] OpenAI error', response.status, errorBody.slice(0, 2000));
        throw new Error(`OpenAI request failed with status ${response.status}`);
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null }; finish_reason?: string }>;
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI response contained no content');
      }
      return content;
    },
  };
}
