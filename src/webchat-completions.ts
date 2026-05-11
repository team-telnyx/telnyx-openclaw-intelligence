/**
 * Shared Telnyx AI provider helpers.
 *
 * Runtime requests are handled by OpenClaw's built-in `openai-completions`
 * transport. That transport appends `/chat/completions` to the configured
 * base URL, so the canonical Telnyx AI base URL is:
 *   https://api.telnyx.com/v2/ai
 */

/** Telnyx AI Inference API base URL used by OpenClaw's OpenAI-compatible transport. */
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
