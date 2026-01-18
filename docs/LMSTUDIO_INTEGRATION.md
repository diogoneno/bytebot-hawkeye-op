# LMStudio Integration Guide

Complete guide for integrating local Vision Language Models (VLMs) from LMStudio with Bytebot Hawkeye.

## Overview

Bytebot Hawkeye supports **automatic discovery and configuration** of Vision Language Models (VLMs) running on LMStudio. This allows you to use powerful local models for computer use tasks without sending data to external APIs.

## Features

✅ **Automatic VLM Discovery** - Auto-detects all Vision Language Models from LMStudio
✅ **Zero Manual Configuration** - One command to configure all models
✅ **Smart Filtering** - Only adds VLMs, excludes text-only models
✅ **UI Integration** - Models appear immediately in the UI model picker
✅ **Network Support** - LMStudio can run on separate machine with GPU

## Quick Start

### 1. Setup LMStudio (One-Time)

**On your LMStudio machine:**

1. Download and install [LMStudio](https://lmstudio.ai/)
2. Download VLM models (recommended):
   - `qwen2.5-vl-32b-instruct` (best for computer use)
   - `llava-v1.6-34b` (good alternative)
   - `ui-tars-72b-dpo` (UI-specific)
3. Enable **Local Server** in LMStudio settings
4. Start the local server (default port: 1234)

### 2. Auto-Discover Models (On Bytebot Machine)

**Interactive (Recommended):**
```bash
# Prompted during start-stack.sh or fresh-build.sh
./scripts/start-stack.sh
# When asked: "Configure LMStudio models? [y/N]:" → Enter 'y'
```

**Manual:**
```bash
./scripts/setup-lmstudio.sh
# Enter LMStudio host when prompted (default: localhost)
```

### 3. Restart Stack

```bash
./scripts/stop-stack.sh
./scripts/start-stack.sh
```

### 4. Use in UI

1. Open Bytebot UI: http://localhost:9992
2. Click model dropdown
3. Select your LMStudio model (e.g., `local-lmstudio-qwen2.5-vl-32b`)
4. Create tasks normally - model runs locally!

## How It Works

### Discovery Process

```
setup-lmstudio.sh
    ↓
1. Connect to http://{host}:1234/v1/models
    ↓
2. Fetch all available models
    ↓
3. Filter to VLMs only (pattern matching)
    ↓
4. Generate litellm-config.yaml entries
    ↓
5. Update configuration file
    ↓
6. Models appear in UI on restart
```

### VLM Detection Rules

Models are identified as VLMs if their name contains:

**Pattern Matching:**
- `vl` (vision-language)
- `vision`
- `visual`
- `multimodal`

**Known Families:**
- `llava` (all variants)
- `qwen*-vl` (Qwen Vision-Language)
- `cogvlm` (CogVLM)
- `internvl` (InternVL)
- `ui-tars` (UI-specific models)

**Excluded:**
- Text-only models (gemma, llama, mistral, etc.)
- Models without vision capabilities

## Configuration

### LMStudio Host

**Default:** `localhost`

**Change via:**
```bash
./scripts/setup-lmstudio.sh
# Enter new host when prompted
```

**Or edit `.env.defaults`:**
```bash
# docker/.env.defaults
LMSTUDIO_URL=http://localhost:1234
LMSTUDIO_API_BASE=http://localhost:1234/v1
```

### Network Setup

**Same Machine:**
```bash
LMSTUDIO_URL=http://localhost:1234
LMSTUDIO_API_BASE=http://localhost:1234/v1
```

**Separate Machine:**
```bash
LMSTUDIO_URL=http://192.168.4.250:1234
LMSTUDIO_API_BASE=http://192.168.4.250:1234/v1
# Ensure firewall allows port 1234
```

**Docker Host:**
```bash
LMSTUDIO_URL=http://host.docker.internal:1234
LMSTUDIO_API_BASE=http://host.docker.internal:1234/v1
```

## Example: Auto-Generated Configuration

After running `setup-lmstudio.sh`, `litellm-config.yaml` will contain:

```yaml
model_list:
  # ... existing models ...

  # LMStudio VLM models (auto-discovered on 2025-10-23 14:30:00)
  - model_name: local-lmstudio-qwen2.5-vl-32b-instruct
    litellm_params:
      model: openai/qwen2.5-vl-32b-instruct
      api_base: os.environ/LMSTUDIO_API_BASE
      api_key: lm-studio
      supports_function_calling: true
    model_info:
      supports_vision: true

  - model_name: local-lmstudio-llava-v1.6-34b
    litellm_params:
      model: openai/llava-v1.6-34b
      api_base: os.environ/LMSTUDIO_API_BASE
      api_key: lm-studio
      supports_function_calling: true
    model_info:
      supports_vision: true

  - model_name: local-lmstudio-ui-tars-72b-dpo
    litellm_params:
      model: openai/ui-tars-72b-dpo
      api_base: os.environ/LMSTUDIO_API_BASE
      api_key: lm-studio
      supports_function_calling: true
    model_info:
      supports_vision: true
```

## Recommended Models

### Best for Computer Use

**Qwen2.5-VL-32B-Instruct**
- **Size:** 32B parameters (~20GB VRAM)
- **Strengths:** Excellent UI understanding, function calling
- **Speed:** Fast (with GPU)
- **Download:** Available in LMStudio model library

**UI-TARS-72B-DPO**
- **Size:** 72B parameters (~45GB VRAM)
- **Strengths:** UI-specific training, precise clicking
- **Speed:** Slower but very accurate
- **Download:** Hugging Face or LMStudio

**Llava-v1.6-34B**
- **Size:** 34B parameters (~21GB VRAM)
- **Strengths:** General vision-language, good reasoning
- **Speed:** Medium
- **Download:** Available in LMStudio model library

### Hardware Requirements

| Model | VRAM | Recommended GPU | Speed |
|-------|------|----------------|-------|
| Qwen2.5-VL-32B | 20GB | RTX 4090, A6000 | Fast |
| UI-TARS-72B | 45GB | A100, Multi-GPU | Slow |
| Llava-v1.6-34B | 21GB | RTX 4090, A6000 | Medium |

## Troubleshooting

### "Cannot connect to LMStudio"

**Check:**
1. LMStudio is running
2. Local server is enabled in LMStudio settings
3. Port 1234 is accessible
4. Firewall allows connections

**Test manually:**
```bash
curl http://localhost:1234/v1/models
```

### "No VLM models found"

**Cause:** Only text-only models are loaded in LMStudio

**Solution:**
1. Download VLM models in LMStudio
2. Look for models with "vl", "vision", or "visual" in name
3. Load a VLM model in LMStudio
4. Rerun `./scripts/setup-lmstudio.sh`

### Models not appearing in UI

**Check:**
1. Restart entire stack: `./scripts/stop-stack.sh && ./scripts/start-stack.sh`
2. Verify models in `packages/bytebot-llm-proxy/litellm-config.yaml`
3. Check proxy logs: `docker logs bytebot-llm-proxy`
4. Verify `BYTEBOT_LLM_PROXY_URL` is set in `.env.defaults`

### Slow inference

**Solutions:**
1. Use smaller model (Qwen2.5-VL-32B instead of UI-TARS-72B)
2. Enable GPU acceleration in LMStudio
3. Reduce context length in LMStudio settings
4. Use quantized models (Q4, Q5)

## Advanced Usage

### Manual Model Configuration

If auto-discovery doesn't work, manually add to `litellm-config.yaml`:

```yaml
  - model_name: my-custom-vlm
    litellm_params:
      model: openai/my-model-name
      api_base: http://localhost:1234/v1
      api_key: lm-studio
    model_info:
      supports_vision: true  # REQUIRED for VLMs
```

### Multiple LMStudio Servers

Configure multiple LMStudio instances:

```yaml
  # Server 1 (fast models)
  - model_name: lmstudio1-qwen2.5-vl
    litellm_params:
      model: openai/qwen2.5-vl-32b
      api_base: http://localhost:1234/v1
      api_key: lm-studio

  # Server 2 (large models)
  - model_name: lmstudio2-ui-tars
    litellm_params:
      model: openai/ui-tars-72b
      api_base: http://192.168.4.251:1234/v1
      api_key: lm-studio
```

### Re-Discovery

Models change frequently. Re-run discovery anytime:

```bash
./scripts/setup-lmstudio.sh
# Old auto-discovered models are replaced
# Manually added models are preserved
```

## Performance Comparison

### Local (LMStudio) vs Cloud

| Metric | LMStudio (Local) | Cloud API |
|--------|-----------------|-----------|
| **Latency** | 2-10s per request | 1-3s per request |
| **Privacy** | ✅ 100% local | ❌ Data sent externally |
| **Cost** | ✅ Free (after GPU) | 💰 Per-request pricing |
| **Model Choice** | Limited to local | All available models |
| **Offline** | ✅ Works offline | ❌ Requires internet |

**Recommendation:**
- **Use LMStudio for:** Sensitive data, offline scenarios, cost savings
- **Use Cloud for:** Speed, variety, latest models

## FAQ

**Q: Can I use LMStudio on a different machine?**

A: Yes! LMStudio can run on any machine with GPU. Just enter the IP when prompted.

**Q: How many models can I add?**

A: Unlimited. Each model appears in the UI dropdown.

**Q: Do LMStudio models support function calling?**

A: Yes! The configuration sets `supports_function_calling: true` for all models.

**Q: Can I use non-VLM models from LMStudio?**

A: You can manually add them to `litellm-config.yaml`, but they won't work for computer use tasks (require vision).

**Q: What if LMStudio changes port?**

A: Edit `LMSTUDIO_URL` in `.env.defaults` and rerun `setup-lmstudio.sh`.

**Q: How do I remove LMStudio models?**

A: Edit `packages/bytebot-llm-proxy/litellm-config.yaml` and delete the auto-generated section, then restart.

## Resources

- [LMStudio Download](https://lmstudio.ai/)
- [LMStudio Documentation](https://lmstudio.ai/docs)
- [Recommended VLM Models](https://huggingface.co/models?pipeline_tag=image-text-to-text)
- [Bytebot Model Configuration](../packages/bytebot-llm-proxy/litellm-config.yaml)

## Support

For issues:
1. Check troubleshooting section above
2. Verify LMStudio logs
3. Review Bytebot proxy logs: `docker logs bytebot-llm-proxy`
4. Open GitHub issue with configuration details
