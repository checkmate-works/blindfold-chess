import type { Result } from '@blindfold-chess/features/utils';

/**
 * Provider-agnostic completion port. `generateReview` (and its tests) depend
 * on this interface only; the OpenAI adapter in `./openai` is the sole
 * production implementation. Swapping providers = one new adapter file.
 */
export type LlmCompletionRequest = {
  system: string;
  user: string;
  /** Name for the provider's structured-output format declaration. */
  schemaName: string;
  /** Strict JSON Schema the provider must enforce on the output. */
  schema: Record<string, unknown>;
  /** Output budget, in the provider's output-token unit. */
  maxOutputTokens: number;
};

/**
 * Why the completion failed, as a value.
 *
 * The kinds exist to separate retryable from final: a 429 or a 5xx is worth
 * another attempt, a bad key or a rejected schema is not. Signalled as a
 * thrown, status-stringified `Error`, every failure looked alike to the
 * caller, which retried all of them at full token cost.
 */
export type LlmError =
  | { kind: 'rate_limited'; status: number }
  | { kind: 'auth'; status: number }
  /** Any other 4xx: malformed request, rejected schema, unsupported model. */
  | { kind: 'client'; status: number }
  | { kind: 'server'; status: number }
  /** Never reached the provider (network failure, abort, malformed response). */
  | { kind: 'transport'; cause: unknown }
  /** The provider answered, but with no content to parse. */
  | { kind: 'empty_content' };

/** Whether another attempt could plausibly succeed. */
export function isRetryableLlmError(error: LlmError): boolean {
  return error.kind === 'rate_limited' || error.kind === 'server' || error.kind === 'transport';
}

export type LlmClient = {
  /** Model id actually used (persisted alongside the review). */
  readonly model: string;
  /** The raw JSON text of the completion, or why it could not be produced. */
  complete(request: LlmCompletionRequest): Promise<Result<string, LlmError>>;
};
