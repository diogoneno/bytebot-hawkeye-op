# vLLM Integration Guide

Complete guide for integrating local Vision Language Models (VLMs) served by vLLM with Bytebot Hawkeye.

Bytebot supports **automatic discovery and configuration** of VLMs running on vLLM. This allows you to use powerful local models for computer use tasks without sending data to external APIs.

## ✅ Features
- **Automatic VLM Discovery** - Auto-detects VLMs exposed by vLLM `/v1/models`
- **Network Support** - vLLM can run on a separate machine with GPU
- **OpenAI-Compatible** - Uses vLLM’s OpenAI API surface for easy interoperability

## 1. Setup vLLM (One-Time)

**On your vLLM machine:**

1. Install vLLM and start the OpenAI-compatible server, e.g.:
   ```bash
   python -m vllm.entrypoints.openai.api_server \
     --model Qwen/Qwen2-VL-7B-Instruct \
     --host 0.0.0.0 \
     --port 8000
   ```

2. Ensure the server is reachable from the Bytebot host:
   ```bash
   curl http://<vllm-host>:8000/v1/models
   ```

## 2. Run Bytebot Setup (Auto-Discovery)

From the repo root:

```bash
./scripts/start-stack.sh
```

When prompted:
```
Configure vLLM models? [y/N]: y
```

You will be asked for the vLLM host and port (defaults: `localhost:8000`).

## 3. Select the Model in the UI

1. Open the Bytebot UI: `http://localhost:9992`
2. Pick a model under **vLLM (Local)**, for example:
   - `local-vllm-qwen2-vl-7b-instruct`

## 4. Environment Variables

The auto-discovery script updates these in `docker/.env.defaults`:

```bash
VLLM_URL=http://localhost:8000
VLLM_API_BASE=http://localhost:8000/v1
# Optional if your server enforces auth
VLLM_API_KEY=
```

## Troubleshooting

### “Cannot connect to vLLM”
1. Confirm vLLM is running and reachable:
   ```bash
   curl http://<vllm-host>:8000/v1/models
   ```
2. Verify port `8000` is open.
3. If using auth, ensure `VLLM_API_KEY` is set.

### “No VLM models found”
**Cause:** vLLM models do not match VLM patterns.

**Fixes:**
1. Ensure a VLM (e.g., Qwen2-VL, LLaVA, InternVL) is loaded.
2. Verify the model name appears in `/v1/models`.
3. Add the model manually to `packages/bytebot-llm-proxy/litellm-config.yaml` if needed.

## Manual Model Entry Example

```yaml
model_list:
  - model_name: local-vllm-qwen2-vl
    litellm_params:
      model: openai/Qwen/Qwen2-VL-7B-Instruct
      api_base: os.environ/VLLM_API_BASE
      api_key: os.environ/VLLM_API_KEY
      supports_function_calling: true
    model_info:
      supports_vision: true
```

## References
- [vLLM GitHub](https://github.com/vllm-project/vllm)
- [vLLM OpenAI-Compatible Server](https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html)
