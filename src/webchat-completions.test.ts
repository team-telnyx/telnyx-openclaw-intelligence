import { describe, expect, it } from "vitest";
import {
  normalizeTelnyxModelId,
  TELNYX_DEFAULT_MODEL,
  TELNYX_INFERENCE_BASE_URL,
} from "./webchat-completions.js";
import { normalizeTelnyxBaseUrl, TELNYX_DEFAULT_MODELS } from "./intelligence-provider.js";

// ── Model name normalization ──────────────────────────────────────────

describe("normalizeTelnyxModelId", () => {
  it("strips the 'telnyx/' prefix from model ids", () => {
    expect(normalizeTelnyxModelId("telnyx/meta-llama/Meta-Llama-3.1-70B-Instruct")).toBe(
      "meta-llama/Meta-Llama-3.1-70B-Instruct",
    );
  });

  it("strips the prefix case-insensitively", () => {
    expect(normalizeTelnyxModelId("Telnyx/meta-llama/Meta-Llama-3.1-8B-Instruct")).toBe(
      "meta-llama/Meta-Llama-3.1-8B-Instruct",
    );
  });

  it("passes through models without the prefix unchanged", () => {
    expect(normalizeTelnyxModelId("meta-llama/Meta-Llama-3.1-70B-Instruct")).toBe(
      "meta-llama/Meta-Llama-3.1-70B-Instruct",
    );
  });

  it("returns the default model for an empty string", () => {
    expect(normalizeTelnyxModelId("")).toBe(TELNYX_DEFAULT_MODEL);
  });

  it("returns the default model for a whitespace-only string", () => {
    expect(normalizeTelnyxModelId("   ")).toBe(TELNYX_DEFAULT_MODEL);
  });

  it("returns the default model when only 'telnyx/' is provided", () => {
    expect(normalizeTelnyxModelId("telnyx/")).toBe(TELNYX_DEFAULT_MODEL);
  });

  it("trims whitespace before processing", () => {
    expect(normalizeTelnyxModelId("  telnyx/openai/gpt-5  ")).toBe("openai/gpt-5");
  });

  it("TELNYX_DEFAULT_MODEL is the expected value", () => {
    expect(TELNYX_DEFAULT_MODEL).toBe("meta-llama/Meta-Llama-3.1-70B-Instruct");
  });
});

// ── Base URL normalization ────────────────────────────────────────────

describe("normalizeTelnyxBaseUrl", () => {
  it("uses the canonical Telnyx AI base URL by default", () => {
    expect(normalizeTelnyxBaseUrl()).toBe(TELNYX_INFERENCE_BASE_URL);
  });

  it("preserves the canonical Telnyx AI base URL", () => {
    expect(normalizeTelnyxBaseUrl("https://api.telnyx.com/v2/ai")).toBe(
      "https://api.telnyx.com/v2/ai",
    );
  });

  it("strips the chat completions suffix when a full URL is provided", () => {
    expect(
      normalizeTelnyxBaseUrl("https://api.telnyx.com/v2/ai/chat/completions"),
    ).toBe("https://api.telnyx.com/v2/ai");
  });

  it("strips the legacy webchat completions suffix when a full URL is provided", () => {
    expect(
      normalizeTelnyxBaseUrl("https://api.telnyx.com/v2/ai/webchat/completions"),
    ).toBe("https://api.telnyx.com/v2/ai");
  });
});

// ── Catalog sanity ────────────────────────────────────────────────────

describe("TELNYX_DEFAULT_MODELS", () => {
  it("includes the live models reported during PR validation", () => {
    expect(TELNYX_DEFAULT_MODELS).toContain("openai/gpt-5");
    expect(TELNYX_DEFAULT_MODELS).toContain("openai/gpt-5.1");
    expect(TELNYX_DEFAULT_MODELS).toContain("anthropic/claude-opus-4-6");
    expect(TELNYX_DEFAULT_MODELS).toContain("google/gemini-2.5-flash");
    expect(TELNYX_DEFAULT_MODELS).toContain("Groq/gpt-oss-120b");
  });

  it("does not advertise models missing from the live catalog", () => {
    expect(TELNYX_DEFAULT_MODELS).not.toContain("deepseek-ai/DeepSeek-R1");
    expect(TELNYX_DEFAULT_MODELS).not.toContain("deepseek-ai/DeepSeek-V3");
    expect(TELNYX_DEFAULT_MODELS).not.toContain("meta-llama/Llama-4-Scout-17B-16E-Instruct");
  });
});
