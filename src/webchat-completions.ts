/**
 * Telnyx AI webchat-completions transport.
 *
 * Routes OpenAI-compatible webchat completion requests to the Telnyx AI API:
 *   POST https://api.telnyx.com/v2/ai/webchat/completions
 *
 * Supports both streaming (SSE) and non-streaming responses.
 * The Telnyx Inference API is fully OpenAI-compatible, so we pass the
 * request body through unchanged after normalizing the model name.
 */

/** Default Telnyx Inference API base URL. */
export const TELNYX_INFERENCE_BASE_URL = "https://api.telnyx.com/v2/ai";

/** Default model used when none is configured. */
export const TELNYX_DEFAULT_MODEL = "meta-llama/Meta-Llama-3.1-70B-Instruct";

/**
 * Strip the "telnyx/" provider prefix from model IDs, if present.
 *
 * OpenClaw resolves models as "telnyx/meta-llama/Meta-Llama-3.1-70B-Instruct"
 * (provider/model-id). The Telnyx API only wants the raw model id.
 *
 * @example
 * normalizeTelnyxModelId("telnyx/meta-llama/Meta-Llama-3.1-70B-Instruct")
 * // => "meta-llama/Meta-Llama-3.1-70B-Instruct"
 *
 * normalizeTelnyxModelId("meta-llama/Meta-Llama-3.1-70B-Instruct")
 * // => "meta-llama/Meta-Llama-3.1-70B-Instruct"
 *
 * normalizeTelnyxModelId("")
 * // => TELNYX_DEFAULT_MODEL
 */
export function normalizeTelnyxModelId(model: string): string {
  const trimmed = model.trim();
  if (!trimmed) return TELNYX_DEFAULT_MODEL;
  // Strip "telnyx/" prefix (case-insensitive)
  if (trimmed.toLowerCase().startsWith("telnyx/")) {
    const stripped = trimmed.slice("telnyx/".length);
    return stripped || TELNYX_DEFAULT_MODEL;
  }
  return trimmed;
}

/** Options for a Telnyx webchat-completions request. */
export interface TelnyxChatCompletionsOptions {
  /** API key for Bearer auth. Falls back to TELNYX_API_KEY env var. */
  apiKey?: string;
  /** Base URL override. Defaults to TELNYX_INFERENCE_BASE_URL. */
  baseUrl?: string;
  /** Raw request body (OpenAI-compatible). */
  body: Record<string, unknown>;
  /** Abort signal for cancellation/timeout. */
  signal?: AbortSignal;
}

/** Build the request URL for webchat completions. */
export function buildTelnyxChatUrl(baseUrl?: string): string {
  const base = (baseUrl ?? TELNYX_INFERENCE_BASE_URL).replace(/\/+$/, "");
  return `${base}/openai/webchat/completions`;
}

/** Resolve the API key from options or environment. */
export function resolveApiKey(options: Pick<TelnyxChatCompletionsOptions, "apiKey">): string {
  const key = options.apiKey?.trim() ?? process.env["TELNYX_API_KEY"]?.trim();
  if (!key) {
    throw new Error(
      "Telnyx API key missing — set TELNYX_API_KEY or configure models.providers.telnyx.apiKey",
    );
  }
  return key;
}

/**
 * Build the Authorization header for a Telnyx API request.
 */
export function buildAuthHeader(apiKey: string): string {
  return `Bearer ${apiKey}`;
}

/**
 * Send a webchat-completions request to the Telnyx AI API.
 *
 * Returns the raw `Response` so the caller can handle both streaming
 * and non-streaming payloads.
 */
export async function sendTelnyxChatRequest(
  options: TelnyxChatCompletionsOptions,
): Promise<Response> {
  const apiKey = resolveApiKey(options);
  const url = buildTelnyxChatUrl(options.baseUrl);

  const body = { ...options.body };

  // Normalize the model id before sending
  const rawModel = typeof body["model"] === "string" ? body["model"] : "";
  body["model"] = normalizeTelnyxModelId(rawModel);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: buildAuthHeader(apiKey),
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  return response;
}

// ── SSE / Streaming helpers ───────────────────────────────────────────

/** A single parsed SSE data line. */
export interface SseChunk {
  /** Raw data string from the `data:` field. */
  data: string;
}

/**
 * Parse SSE lines from a ReadableStream<Uint8Array>.
 *
 * Yields parsed data chunks. Stops on `data: [DONE]`.
 */
export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SseChunk> {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue; // skip comments/empty

        if (trimmed.startsWith("data:")) {
          const data = trimmed.slice("data:".length).trim();
          if (data === "[DONE]") return;
          yield { data };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Extract the text delta from an OpenAI-compatible SSE chunk.
 *
 * Returns `undefined` if the chunk doesn't contain a text delta.
 */
export function extractTextDelta(chunk: SseChunk): string | undefined {
  try {
    const parsed = JSON.parse(chunk.data) as {
      choices?: Array<{
        delta?: { content?: string | null };
        finish_reason?: string | null;
      }>;
    };
    return parsed.choices?.[0]?.delta?.content ?? undefined;
  } catch {
    return undefined;
  }
}
