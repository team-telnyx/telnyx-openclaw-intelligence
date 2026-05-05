# Telnyx Intelligence Provider (AIF-127)

Native Telnyx AI text-inference plugin for OpenClaw. Registers the `telnyx` provider for webchat completions — no LiteLLM proxy needed.

## Install

```bash
openclaw skills install ~/projects/telnyx-ocplatform-intelligence
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
- `telnyx/meta-llama/Llama-4-Scout-17B-16E-Instruct`
- `telnyx/deepseek-ai/DeepSeek-R1`
- `telnyx/deepseek-ai/DeepSeek-V3`

## Source

`~/projects/telnyx-ocplatform-intelligence`
