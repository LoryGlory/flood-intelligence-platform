/**
 * LLM provider interface.
 *
 * All providers must implement this single method.  This keeps the agent
 * decoupled from any specific LLM vendor — swapping Claude for GPT-4 or
 * a local model is a one-file change.
 *
 * The agent sends a structured system + user prompt and expects a JSON string
 * back that it parses and validates.
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMProvider {
  /**
   * Send a list of messages and receive the model's text reply.
   * The implementation handles retries, auth, and model selection.
   *
   * @throws {LLMProviderError} on non-retryable failures
   */
  complete(messages: LLMMessage[]): Promise<string>;

  /** Human-readable provider name for logging / UI display */
  readonly name: string;
}

export class LLMProviderError extends Error {
  public readonly providerName: string;
  public readonly originalCause: unknown;

  constructor(message: string, providerName: string, originalCause?: unknown) {
    super(message);
    this.name = "LLMProviderError";
    this.providerName = providerName;
    this.originalCause = originalCause;
  }
}
