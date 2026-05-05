/**
 * telnyx-openclaw-intelligence
 *
 * Registers Telnyx as a first-class text-inference provider for OpenClaw.
 *
 * Uses the Telnyx AI Inference API (OpenAI-compatible) natively —
 * no LiteLLM proxy required. Just set TELNYX_API_KEY.
 *
 * Architecture:
 * - Endpoint: https://api.telnyx.com/v2/ai/openai/webchat/completions
 * - Transport: Standard OpenAI-compatible (api: "openai-completions")
 * - Auth: Bearer TELNYX_API_KEY
 * - Models: meta-llama, deepseek, mistral, google/gemma, and more
 * - Streaming: SSE (standard OpenAI format)
 */

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { buildTelnyxIntelligenceProvider } from "./src/intelligence-provider.js";

export default definePluginEntry({
  id: "telnyx-intelligence",
  name: "Telnyx Intelligence Provider",
  description:
    "Native Telnyx AI text-inference provider for OpenClaw. " +
    "OpenAI-compatible webchat completions — just set TELNYX_API_KEY.",

  register(api) {
    api.registerProvider(buildTelnyxIntelligenceProvider());
  },
});
