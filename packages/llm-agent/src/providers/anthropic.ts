/**
 * AnthropicProvider
 * -----------------
 * Calls the Anthropic Messages API (claude-sonnet-4-6 by default).
 *
 * Setup:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   Set LLM_PROVIDER=anthropic in your .env.local
 *
 * TODO: install `@anthropic-ai/sdk` and uncomment the implementation.
 *   pnpm add @anthropic-ai/sdk --filter @flood/llm-agent
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

  async complete(_messages: LLMMessage[]): Promise<string> {
    /**
     * TODO: uncomment once @anthropic-ai/sdk is installed.
     *
     * import Anthropic from "@anthropic-ai/sdk";
     * const client = new Anthropic({ apiKey: this.apiKey });
     *
     * const system = messages.find(m => m.role === "system")?.content ?? "";
     * const userMessages = messages
     *   .filter(m => m.role !== "system")
     *   .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
     *
     * const response = await client.messages.create({
     *   model: this.model,
     *   max_tokens: 1024,
     *   system,
     *   messages: userMessages,
     * });
     *
     * const block = response.content[0];
     * if (block?.type !== "text") throw new LLMProviderError("Unexpected response type", this.name);
     * return block.text;
     */

    throw new LLMProviderError(
      "AnthropicProvider is not yet activated. " +
        "Run: pnpm add @anthropic-ai/sdk --filter @flood/llm-agent " +
        "then uncomment the implementation in anthropic.ts.",
      this.name
    );
  }
}

/**
 * OpenAIProvider skeleton — identical pattern, different SDK.
 *
 * TODO: uncomment once openai package is installed.
 *   pnpm add openai --filter @flood/llm-agent
 */
export class OpenAIProvider implements LLMProvider {
  readonly name = "OpenAI (gpt-4o)";

  constructor(_options?: { apiKey?: string; model?: string }) {
    // TODO: store apiKey and model
  }

  async complete(_messages: LLMMessage[]): Promise<string> {
    /**
     * TODO: uncomment once openai is installed.
     *
     * import OpenAI from "openai";
     * const client = new OpenAI({ apiKey: this.apiKey });
     * const resp = await client.chat.completions.create({
     *   model: this.model ?? "gpt-4o",
     *   messages: _messages,
     *   response_format: { type: "json_object" },
     * });
     * return resp.choices[0]?.message?.content ?? "";
     */
    throw new LLMProviderError("OpenAIProvider is not yet activated.", this.name);
  }
}
