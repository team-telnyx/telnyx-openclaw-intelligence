# telnyx-openclaw-intelligence

**Native Telnyx AI text-inference provider for OpenClaw.**

Routes OpenAI-compatible chat completion requests directly to the [Telnyx AI Inference API](https://developers.telnyx.com/docs/inference) — no LiteLLM proxy needed.

- OpenAI-compatible API endpoint
- Full streaming (SSE) support
- Bearer token auth via `TELNYX_API_KEY`
- Access to the live Telnyx AI model catalog: Llama 3.x, Qwen, Kimi, MiniMax, GLM, Gemma, OpenAI GPT, Claude, Gemini, Groq OSS, and more

---

## Demo

Installing the plugin from scratch and running an OpenClaw agent on Telnyx-hosted models:

https://github.com/team-telnyx/telnyx-openclaw-intelligence/raw/main/assets/telnyx-intelligence-demo.mp4

<video src="https://github.com/team-telnyx/telnyx-openclaw-intelligence/raw/main/assets/telnyx-intelligence-demo.mp4" controls width="100%"></video>

> If the player doesn't load, [download/view the demo here](assets/telnyx-intelligence-demo.mp4).

---

## Requirements

- Node.js ≥ 22.14.0
- OpenClaw ≥ 2026.4.0
- A [Telnyx API key](https://portal.telnyx.com/#/app/auth/v2)

---

## Installation

### From local source (development)

```bash
openclaw plugins install /path/to/telnyx-openclaw-intelligence
```

Or from your project root:

```bash
cd ~/projects/telnyx-openclaw-intelligence
npm install && npm run build
openclaw plugins install .
```

### From ClaWHub (once published)

```bash
clawhub package install telnyx-openclaw-intelligence
```

---

## Configuration

Set your Telnyx API key:

```bash
export TELNYX_API_KEY="KEY_your_api_key_here"
```

Or configure it in `openclaw.json`:

```json
{
  "models": {
    "providers": {
      "telnyx": {
        "apiKey": "KEY_your_api_key_here"
      }
    }
  }
}
```

### Select a model

```bash
# Use the default model (meta-llama/Meta-Llama-3.1-70B-Instruct)
/model telnyx/meta-llama/Meta-Llama-3.1-70B-Instruct

# Or configure a default in openclaw.json
```

```json
{
  "agents": {
    "defaults": {
      "model": "telnyx/meta-llama/Meta-Llama-3.1-70B-Instruct"
    }
  }
}
```

---

## Available Models

| Model | Notes |
|-------|-------|
| `meta-llama/Meta-Llama-3.1-70B-Instruct` | **Default** — strong general-purpose Llama 3.1 model |
| `meta-llama/Meta-Llama-3.1-8B-Instruct` | Fast, lightweight Llama 3.1 model |
| `meta-llama/Llama-3.3-70B-Instruct` | Llama 3.3 generation model |
| `Qwen/Qwen3-235B-A22B` | Large MoE reasoning model |
| `moonshotai/Kimi-K2.6` | Long-context Kimi model |
| `moonshotai/Kimi-K2.5` | Long-context Kimi model |
| `MiniMaxAI/MiniMax-M2.7` | Long-context MiniMax model |
| `zai-org/GLM-5.1-FP8` | GLM model |
| `google/gemma-2b-it` | Tiny, fast Gemma model |
| `openai/gpt-5` | OpenAI GPT-5 |
| `openai/gpt-5.1` | OpenAI GPT-5.1 |
| `openai/gpt-5.2` | OpenAI GPT-5.2 |
| `openai/gpt-4.1` | OpenAI GPT-4.1 |
| `openai/gpt-4o` | OpenAI GPT-4o |
| `openai/gpt-4o-mini` | OpenAI GPT-4o mini |
| `anthropic/claude-haiku-4-5` | Claude Haiku |
| `anthropic/claude-opus-4-6` | Claude Opus |
| `google/gemini-2.5-flash` | Gemini Flash |
| `Groq/gpt-oss-120b` | Groq-hosted OSS model |

> **Note:** The model list evolves as Telnyx adds/removes models. Use the Telnyx models endpoint to see the current list:
> ```bash
> curl -s https://api.telnyx.com/v2/ai/models -H "Authorization: Bearer $TELNYX_API_KEY" | jq '.data[].id'
> ```

---

## API Endpoint

```
POST https://api.telnyx.com/v2/ai/chat/completions
Authorization: Bearer TELNYX_API_KEY
Content-Type: application/json
```

### Example request

```json
{
  "model": "meta-llama/Meta-Llama-3.1-70B-Instruct",
  "messages": [
    { "role": "system", "content": "You are a personal assistant." },
    { "role": "user", "content": "What is Telnyx?" }
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 1024
}
```

### Live smoke test

```bash
curl -s -X POST https://api.telnyx.com/v2/ai/chat/completions \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Meta-Llama-3.1-70B-Instruct",
    "messages": [{"role": "user", "content": "Say hello in one sentence."}],
    "max_tokens": 50,
    "stream": false
  }' | jq '.choices[0].message.content'
```

---

## Development

```bash
# Install dependencies (resolves against local openclaw)
npm install

# Build (compiles TypeScript to dist/)
npm run build

# Run unit tests
npm test

# Type-check only (no output)
npm run lint
```

### Project structure

```
telnyx-openclaw-intelligence/
├── index.ts                        # Plugin entry point
├── src/
│   ├── intelligence-provider.ts    # Provider registration (registerProvider)
│   ├── webchat-completions.ts         # Shared Telnyx model/provider helpers
│   └── webchat-completions.test.ts    # Unit tests for model/base URL/catalog behavior
├── openclaw.plugin.json          # Plugin manifest
├── package.json
├── tsconfig.json                   # Lint (noEmit)
├── tsconfig.build.json             # Build (with output)
├── README.md
├── LICENSE
└── SKILL.md
```

---

## Architecture Notes

- **No proxy**: The plugin calls Telnyx directly. No LiteLLM or middleware.
- **OpenAI-compat transport**: OpenClaw's built-in `openai-completions` transport is reused.
- **Model normalization**: The `telnyx/` prefix is stripped before requests (e.g., `telnyx/meta-llama/...` → `meta-llama/...`).
- **Auth**: Standard OpenClaw API-key auth flow — env var or `openclaw setup telnyx`.

---

## Related Plugins

- [telnyx-openclaw-tts](../telnyx-openclaw-tts) — AIF-122, Telnyx TTS
- [telnyx-openclaw-stt](../telnyx-openclaw-stt) — AIF-123, Telnyx STT
- [telnyx-openclaw-embeddings](../telnyx-openclaw-embeddings) — AIF-124, Telnyx embeddings

---

## License

MIT © Telnyx LLC
