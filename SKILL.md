# Telnyx Intelligence Provider (AIF-127)

Native Telnyx AI text-inference plugin for OpenClaw. Registers the `telnyx` provider for OpenAI-compatible chat completions — no LiteLLM proxy needed.

## Install

```bash
openclaw skills install ~/projects/telnyx-openclaw-intelligence
```

## Configure

```bash
export TELNYX_API_KEY="KEY_your_api_key_here"
```

## Use

```bash
/model telnyx/meta-llama/Meta-Llama-3.1-70B-Instruct
```

## Key Models

- `telnyx/meta-llama/Meta-Llama-3.1-70B-Instruct` (default)
- `telnyx/openai/gpt-5`
- `telnyx/anthropic/claude-opus-4-6`
- `telnyx/google/gemini-2.5-flash`
- `telnyx/Qwen/Qwen3-235B-A22B`
- `telnyx/moonshotai/Kimi-K2.6`

## Source

`~/projects/telnyx-openclaw-intelligence`
