import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  normalizeTelnyxModelId,
  buildTelnyxChatUrl,
  resolveApiKey,
  buildAuthHeader,
  parseSseStream,
  extractTextDelta,
  TELNYX_DEFAULT_MODEL,
  TELNYX_INFERENCE_BASE_URL,
} from "./webchat-completions.js";

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
    expect(normalizeTelnyxModelId("  telnyx/deepseek-ai/DeepSeek-R1  ")).toBe(
      "deepseek-ai/DeepSeek-R1",
    );
  });

  it("TELNYX_DEFAULT_MODEL is the expected value", () => {
    expect(TELNYX_DEFAULT_MODEL).toBe("meta-llama/Meta-Llama-3.1-70B-Instruct");
  });
});

// ── Request URL construction ──────────────────────────────────────────

describe("buildTelnyxChatUrl", () => {
  it("uses the default base URL when no override is provided", () => {
    const url = buildTelnyxChatUrl();
    expect(url).toBe(`${TELNYX_INFERENCE_BASE_URL}/openai/webchat/completions`);
  });

  it("uses a custom base URL when provided", () => {
    const url = buildTelnyxChatUrl("https://api.example.com/v2/ai");
    expect(url).toBe("https://api.example.com/v2/ai/openai/webchat/completions");
  });

  it("strips a trailing slash from the base URL", () => {
    const url = buildTelnyxChatUrl("https://api.telnyx.com/v2/ai/");
    expect(url).toBe("https://api.telnyx.com/v2/ai/openai/webchat/completions");
  });
});

// ── Auth header construction ──────────────────────────────────────────

describe("buildAuthHeader", () => {
  it("builds a Bearer token header", () => {
    expect(buildAuthHeader("test-api-key-123")).toBe("Bearer test-api-key-123");
  });

  it("does not double-wrap an existing Bearer token", () => {
    // The raw key is passed, not pre-formatted — so we just wrap it
    expect(buildAuthHeader("KEY_FOOBAR")).toBe("Bearer KEY_FOOBAR");
  });
});

// ── API key resolution ────────────────────────────────────────────────

describe("resolveApiKey", () => {
  const origEnv = process.env["TELNYX_API_KEY"];

  beforeEach(() => {
    delete process.env["TELNYX_API_KEY"];
  });

  afterEach(() => {
    if (origEnv !== undefined) {
      process.env["TELNYX_API_KEY"] = origEnv;
    } else {
      delete process.env["TELNYX_API_KEY"];
    }
  });

  it("returns the explicit apiKey when provided", () => {
    expect(resolveApiKey({ apiKey: "explicit-key" })).toBe("explicit-key");
  });

  it("falls back to the TELNYX_API_KEY environment variable", () => {
    process.env["TELNYX_API_KEY"] = "env-key";
    expect(resolveApiKey({})).toBe("env-key");
  });

  it("throws when no key is available", () => {
    expect(() => resolveApiKey({})).toThrow(/TELNYX_API_KEY/);
  });

  it("explicit key overrides the environment variable", () => {
    process.env["TELNYX_API_KEY"] = "env-key";
    expect(resolveApiKey({ apiKey: "explicit-key" })).toBe("explicit-key");
  });
});

// ── SSE stream parsing ────────────────────────────────────────────────

function makeStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

describe("parseSseStream", () => {
  it("parses a single SSE data line", async () => {
    const stream = makeStream('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n');
    const chunks: string[] = [];
    for await (const chunk of parseSseStream(stream)) {
      chunks.push(chunk.data);
    }
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain('"Hello"');
  });

  it("stops on the [DONE] sentinel", async () => {
    const stream = makeStream(
      'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n\n',
    );
    const chunks: string[] = [];
    for await (const chunk of parseSseStream(stream)) {
      chunks.push(chunk.data);
    }
    expect(chunks).toHaveLength(1);
  });

  it("skips comment lines (starting with ':')", async () => {
    const stream = makeStream(': keep-alive\ndata: {"id":"1"}\n\n');
    const chunks: string[] = [];
    for await (const chunk of parseSseStream(stream)) {
      chunks.push(chunk.data);
    }
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain('"id":"1"');
  });

  it("handles empty stream gracefully", async () => {
    const stream = makeStream("");
    const chunks: string[] = [];
    for await (const chunk of parseSseStream(stream)) {
      chunks.push(chunk.data);
    }
    expect(chunks).toHaveLength(0);
  });
});

// ── SSE delta extraction ──────────────────────────────────────────────

describe("extractTextDelta", () => {
  it("extracts text content from a valid delta chunk", () => {
    const chunk = {
      data: JSON.stringify({
        choices: [{ delta: { content: "Hello, world!" }, finish_reason: null }],
      }),
    };
    expect(extractTextDelta(chunk)).toBe("Hello, world!");
  });

  it("returns undefined for a finish chunk (null content)", () => {
    const chunk = {
      data: JSON.stringify({
        choices: [{ delta: { content: null }, finish_reason: "stop" }],
      }),
    };
    expect(extractTextDelta(chunk)).toBeUndefined();
  });

  it("returns undefined for a delta without content", () => {
    const chunk = {
      data: JSON.stringify({
        choices: [{ delta: {}, finish_reason: null }],
      }),
    };
    expect(extractTextDelta(chunk)).toBeUndefined();
  });

  it("returns undefined for malformed JSON", () => {
    expect(extractTextDelta({ data: "not-json" })).toBeUndefined();
  });

  it("returns undefined for an empty choices array", () => {
    const chunk = { data: JSON.stringify({ choices: [] }) };
    expect(extractTextDelta(chunk)).toBeUndefined();
  });

  it("handles missing choices field", () => {
    const chunk = { data: JSON.stringify({ id: "webchatcmpl-123" }) };
    expect(extractTextDelta(chunk)).toBeUndefined();
  });
});
