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

export type LlmClient = {
  /** Model id actually used (persisted alongside the review). */
  readonly model: string;
  /** Returns the raw JSON text of the completion. Throws on transport/API errors. */
  complete(request: LlmCompletionRequest): Promise<string>;
};
