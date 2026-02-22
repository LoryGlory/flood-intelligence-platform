/**
 * Tests for LLM provider implementations.
 *
 * AnthropicProvider: tests constructor validation and complete() via a mocked SDK.
 * OpenAIProvider: tests that it throws the expected not-activated error.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LLMProviderError } from "../src/providers/interface.js";
import { AnthropicProvider, OpenAIProvider } from "../src/providers/anthropic.js";

// ---------------------------------------------------------------------------
// Mock @anthropic-ai/sdk so tests never hit the real API.
// vi.mock is hoisted and intercepts both static and dynamic imports.
// ---------------------------------------------------------------------------
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

// ---------------------------------------------------------------------------
// AnthropicProvider
// ---------------------------------------------------------------------------
describe("AnthropicProvider", () => {
  const ORIGINAL_ENV = process.env["ANTHROPIC_API_KEY"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env["ANTHROPIC_API_KEY"];
    } else {
      process.env["ANTHROPIC_API_KEY"] = ORIGINAL_ENV;
    }
  });

  // --- Constructor ---

  it("throws LLMProviderError when no API key is available", () => {
    delete process.env["ANTHROPIC_API_KEY"];
    expect(() => new AnthropicProvider()).toThrow(LLMProviderError);
  });

  it("reads the API key from the environment variable", () => {
    process.env["ANTHROPIC_API_KEY"] = "sk-test-env";
    expect(() => new AnthropicProvider()).not.toThrow();
  });

  it("accepts an explicit apiKey option over the env var", () => {
    delete process.env["ANTHROPIC_API_KEY"];
    expect(() => new AnthropicProvider({ apiKey: "sk-test-option" })).not.toThrow();
  });

  it('defaults to "claude-sonnet-4-6" model', () => {
    process.env["ANTHROPIC_API_KEY"] = "sk-test";
    const provider = new AnthropicProvider();
    expect(provider.name).toContain("claude-sonnet-4-6");
  });

  // --- complete() ---

  it("returns the text from the first content block", async () => {
    process.env["ANTHROPIC_API_KEY"] = "sk-test";
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "flood summary text" }],
    });

    const provider = new AnthropicProvider();
    const result = await provider.complete([
      { role: "system", content: "You are a flood analyst." },
      { role: "user", content: "Assess the risk." },
    ]);

    expect(result).toBe("flood summary text");
  });

  it("passes system message and user messages to the SDK correctly", async () => {
    process.env["ANTHROPIC_API_KEY"] = "sk-test";
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
    });

    const provider = new AnthropicProvider();
    await provider.complete([
      { role: "system", content: "system prompt" },
      { role: "user", content: "user message" },
    ]);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: "system prompt",
        messages: [{ role: "user", content: "user message" }],
        max_tokens: 1024,
      })
    );
  });

  it("throws LLMProviderError when the API returns a non-text block", async () => {
    process.env["ANTHROPIC_API_KEY"] = "sk-test";
    mockCreate.mockResolvedValue({
      content: [{ type: "tool_use", id: "tool_1", name: "search", input: {} }],
    });

    const provider = new AnthropicProvider();
    await expect(provider.complete([{ role: "user", content: "assess" }])).rejects.toThrow(
      LLMProviderError
    );
  });

  it("propagates SDK errors as-is so the agent can handle them", async () => {
    process.env["ANTHROPIC_API_KEY"] = "sk-test";
    mockCreate.mockRejectedValue(new Error("network timeout"));

    const provider = new AnthropicProvider();
    await expect(provider.complete([{ role: "user", content: "assess" }])).rejects.toThrow(
      "network timeout"
    );
  });
});

// ---------------------------------------------------------------------------
// OpenAIProvider
// ---------------------------------------------------------------------------
describe("OpenAIProvider", () => {
  it("throws LLMProviderError indicating it is not yet activated", async () => {
    const provider = new OpenAIProvider();
    await expect(provider.complete([{ role: "user", content: "test" }])).rejects.toThrow(
      LLMProviderError
    );
  });

  it('has a name that identifies it as "OpenAI"', () => {
    const provider = new OpenAIProvider();
    expect(provider.name).toContain("OpenAI");
  });
});
