/**
 * AnthropicProvider
 * -----------------
 * Calls the Anthropic Messages API (claude-sonnet-4-6 by default).
 *
 * Setup:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   or set ANTHROPIC_API_KEY in packages/web/.env.local
 *
 * The interface is intentionally minimal — the agent controls the full
 * prompt; this class only handles auth, model selection, and retries.
 */

import type { LLMMessage, LLMProvider } from "./interface.js";
import { LLMProviderError } from "./interface.js";

export class AnthropicProvider implements LLMProvider {
  readonly name = "Anthropic (claude-sonnet-4-6)";

  private readonly apiKey: string;
  private readonly model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    const key = options?.apiKey ?? process.env["ANTHROPIC_API_KEY"];
    if (!key) {
      throw new LLMProviderError("ANTHROPIC_API_KEY environment variable is not set.", this.name);
    }
    this.apiKey = key;
    this.model = options?.model ?? "claude-sonnet-4-6";
  }

  async complete(messages: LLMMessage[]): Promise<string> {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: this.apiKey });

    const system = messages.find((m) => m.role === "system")?.content ?? "";
    const userMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const response = await client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system,
      messages: userMessages,
    });

    const block = response.content[0];
    if (block?.type !== "text") {
      throw new LLMProviderError("Unexpected response type from Anthropic API", this.name);
    }
    return block.text;
  }
}

/**
 * OpenAIProvider skeleton — same interface, different SDK.
 * Install `openai` and replace the complete() body to activate.
 *   pnpm add openai --filter @flood/llm-agent
 */
export class OpenAIProvider implements LLMProvider {
  readonly name = "OpenAI (gpt-4o)";

  async complete(_messages: LLMMessage[]): Promise<string> {
    throw new LLMProviderError(
      "OpenAIProvider is not yet activated. Install the openai package to enable it.",
      this.name
    );
  }
}
