/**
 * Telnyx intelligence provider for OpenClaw.
 *
 * Registers Telnyx as a first-class text-inference provider. Routing is
 * handled natively — no LiteLLM proxy required.
 *
 * The Telnyx Inference API is OpenAI-compatible, so we use the standard
 * `normalizeConfig` / `normalizeResolvedModel` / `normalizeTransport`
 * pattern used by Arcee, OpenCode-Go, and similar providers.
 *
 * Authentication:
 *   Priority: 1. models.providers.telnyx.apiKey  2. TELNYX_API_KEY env var
 *
 * Model id format:
 *   OpenClaw resolves models as "telnyx/<model-id>".
 *   The Telnyx API expects only the raw "<model-id>".
 *   The `normalizeModelId` hook strips the prefix at resolution time.
 */

import { createProviderApiKeyAuthMethod } from "openclaw/plugin-sdk/provider-auth-api-key";
import {
  OPENAI_COMPATIBLE_REPLAY_HOOKS,
  type ModelProviderConfig,
} from "openclaw/plugin-sdk/provider-model-shared";
import {
  normalizeTelnyxModelId,
  TELNYX_INFERENCE_BASE_URL,
  TELNYX_DEFAULT_MODEL,
} from "./webchat-completions.js";

const PROVIDER_ID = "telnyx" as const;

/** Path suffix for the Telnyx Inference OpenAI-compat endpoint. */
const TELNYX_OPENAI_PATH = "/openai";

/**
 * Normalize the Telnyx base URL.
 *
 * Telnyx uses `https://api.telnyx.com/v2/ai` as the root. If the caller
 * has set the full OpenAI-compat path, strip it — the transport appends
 * the correct path itself.
 */
export function normalizeTelnyxBaseUrl(baseUrl?: string): string {
  if (!baseUrl?.trim()) return TELNYX_INFERENCE_BASE_URL;
  let url = baseUrl.trim().replace(/\/+$/, "");
  if (url.endsWith(TELNYX_OPENAI_PATH)) {
    url = url.slice(0, -TELNYX_OPENAI_PATH.length);
  }
  return url;
}

/**
 * Curated subset of Telnyx-hosted models.
 *
 * Full live catalog: GET https://api.telnyx.com/v2/ai/models.
 */
export const TELNYX_DEFAULT_MODELS = [
  "meta-llama/Meta-Llama-3.1-70B-Instruct",
  "meta-llama/Meta-Llama-3.1-8B-Instruct",
  "meta-llama/Llama-3.3-70B-Instruct",
  "Qwen/Qwen3-235B-A22B",
  "moonshotai/Kimi-K2.6",
  "moonshotai/Kimi-K2.5",
  "MiniMaxAI/MiniMax-M2.7",
  "zai-org/GLM-5.1-FP8",
  "google/gemma-2b-it",
] as const;

/**
 * Build the Telnyx intelligence provider auth method.
 */
function buildTelnyxAuthMethod() {
  return createProviderApiKeyAuthMethod({
    providerId: PROVIDER_ID,
    methodId: "api-key",
    label: "Telnyx API key",
    hint: "Chat completions via Telnyx AI (OpenAI-compatible)",
    optionKey: "telnyxApiKey",
    flagName: "--telnyx-api-key",
    envVar: "TELNYX_API_KEY",
    promptMessage: "Enter your Telnyx API key",
    profileId: "telnyx:default",
    defaultModel: `${PROVIDER_ID}/${TELNYX_DEFAULT_MODEL}`,
    expectedProviders: [PROVIDER_ID],
    wizard: {
      choiceId: "telnyx-api-key",
      choiceLabel: "Telnyx API key",
      choiceHint: "Open-weight LLMs via Telnyx AI",
      groupId: "telnyx",
      groupLabel: "Telnyx AI",
      groupHint: "Native webchat completions — no proxy required",
    },
  });
}

/**
 * Build the Telnyx intelligence provider plugin object.
 *
 * Passed to `api.registerProvider()`. Implements the OpenClaw
 * `ProviderPlugin` contract for an OpenAI-compatible text-inference provider.
 */
export function buildTelnyxIntelligenceProvider() {
  return {
    id: PROVIDER_ID,
    label: "Telnyx AI",
    docsPath: "/providers/telnyx",
    envVars: ["TELNYX_API_KEY"],
    auth: [buildTelnyxAuthMethod()],

    /**
     * Normalize the provider config's baseUrl and api transport.
     */
    normalizeConfig: ({
      providerConfig,
    }: {
      provider: string;
      providerConfig: ModelProviderConfig;
    }): ModelProviderConfig | null | undefined => {
      const changes: Partial<ModelProviderConfig> = {};

      const normalizedBaseUrl = normalizeTelnyxBaseUrl(providerConfig.baseUrl);
      if (normalizedBaseUrl !== providerConfig.baseUrl) {
        changes.baseUrl = normalizedBaseUrl;
      }

      if (!providerConfig.api) {
        changes.api = "openai-completions";
      }

      return Object.keys(changes).length > 0 ? { ...providerConfig, ...changes } : undefined;
    },

    /**
     * Strip "telnyx/" prefix from model IDs before lookup.
     *
     * OCPlatform passes model refs as "telnyx/<model-id>"; the Telnyx
     * API only wants the raw "<model-id>".
     */
    normalizeModelId: ({
      modelId,
    }: {
      provider: string;
      modelId: string;
    }): string | null | undefined => {
      const normalized = normalizeTelnyxModelId(modelId);
      return normalized !== modelId ? normalized : undefined;
    },

    /**
     * Normalize the baseUrl on a fully-resolved runtime model.
     *
     * We use a generic T that extends a minimal model shape, which is
     * compatible with ProviderRuntimeModel while avoiding a direct dep on
     * the internal pi-ai type.
     */
    normalizeResolvedModel: <T extends { id: string; baseUrl: string }>(
      { model }: { model: T },
    ): T | null | undefined => {
      const normalizedBaseUrl = normalizeTelnyxBaseUrl(model.baseUrl);
      if (normalizedBaseUrl !== model.baseUrl) {
        return { ...model, baseUrl: normalizedBaseUrl };
      }
      return undefined;
    },

    /**
     * Normalize the transport family and base URL.
     */
    normalizeTransport: ({
      api,
      baseUrl,
    }: {
      api?: string | null;
      baseUrl?: string;
    }): { api?: string | null; baseUrl?: string } | null | undefined => {
      const normalizedBaseUrl = normalizeTelnyxBaseUrl(baseUrl);
      const normalizedApi = !api || api === "openai-webchat" ? "openai-completions" : api;

      if (normalizedBaseUrl !== baseUrl || normalizedApi !== api) {
        return { api: normalizedApi, baseUrl: normalizedBaseUrl };
      }
      return undefined;
    },

    /**
     * Augment the model catalog with the curated Telnyx model list.
     */
    augmentModelCatalog: (): Array<{
      provider: string;
      id: string;
      name: string;
      compat: { supportsUsageInStreaming: boolean };
      input: ("text" | "image")[];
    }> => {
      return TELNYX_DEFAULT_MODELS.map((modelId) => ({
        provider: PROVIDER_ID,
        id: modelId,
        name: modelId.split("/").pop() ?? modelId,
        compat: { supportsUsageInStreaming: true },
        input: ["text"],
      }));
    },

    /** Mark all Telnyx models as modern for profile/smoke filters. */
    isModernModelRef: (): boolean => true,

    // Standard OpenAI-compatible replay hooks
    ...OPENAI_COMPATIBLE_REPLAY_HOOKS,
  };
}
