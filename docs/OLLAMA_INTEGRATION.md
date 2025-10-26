# Ollama Integration Guide

Complete guide for integrating local Vision Language Models (VLMs) from Ollama with Bytebot Hawkeye.

## Overview

Bytebot Hawkeye supports **automatic discovery and configuration** of Vision Language Models (VLMs) running on Ollama. This allows you to use powerful local models for computer use tasks without sending data to external APIs.

## Features

✅ **Automatic VLM Discovery** - Auto-detects all Vision Language Models from Ollama
✅ **Zero Manual Configuration** - One command to configure all models
✅ **Smart Filtering** - Only adds VLMs, excludes text-only models
✅ **UI Integration** - Models appear immediately in the UI model picker
✅ **Local or Network** - Ollama can run locally or on a separate machine with GPU

## Quick Start

### 1. Setup Ollama (One-Time)

**On your Ollama machine:**

1. Install Ollama:
   ```bash
   # macOS / Linux
   curl -fsSL https://ollama.com/install.sh | sh

   # Or download from: https://ollama.com/download
   ```

2. Download VLM models (recommended):
   ```bash
   ollama pull llava:latest        # 7B - Good balance
   ollama pull llava:13b          # 13B - Better accuracy
   ollama pull llava:34b          # 34B - Best for computer use
   ollama pull qwen2-vl:7b        # Qwen vision model
   ollama pull minicpm-v:latest   # MiniCPM vision model
   ```

3. Verify Ollama is running:
   ```bash
   ollama list
   curl http://localhost:11434/api/tags
   ```

### 2. Auto-Discover Models (On Bytebot Machine)

**Interactive (Recommended):**
```bash
# Prompted during start-stack.sh or fresh-build.sh
./scripts/start-stack.sh
# When asked: "Configure Ollama models? [y/N]:" → Enter 'y'
```

**Manual:**
```bash
./scripts/setup-ollama.sh
# Enter Ollama URL when prompted (default: http://localhost:11434)
```

### 3. Restart Stack

```bash
./scripts/stop-stack.sh
./scripts/start-stack.sh
```

### 4. Use in UI

1. Open Bytebot UI: http://localhost:9992
2. Click model dropdown
3. Select your Ollama model (e.g., `local-ollama-llava-13b`)
4. Create tasks normally - model runs locally!

## How It Works

### Discovery Process

```
setup-ollama.sh
    ↓
1. Connect to http://localhost:11434/api/tags
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
- `llava` (all variants)
- `qwen*-vl` or `qwen*-vision`
- `minicpm-v` (MiniCPM vision)
- `bakllava` (BakLLaVa)
- `vision`, `vl`, `visual` (generic patterns)

**Excluded:**
- Text-only models (llama, mistral, gemma-text, etc.)
- Models without vision capabilities

## Configuration

### Ollama URL

**Default:** `http://localhost:11434`

**Change via:**
```bash
./scripts/setup-ollama.sh
# Enter new URL when prompted
```

**Or edit `.env.defaults`:**
```bash
# docker/.env.defaults
OLLAMA_URL=http://localhost:11434
```

### Network Setup

**Same Machine (Default):**
```bash
OLLAMA_URL=http://localhost:11434
```

**Separate Machine:**
```bash
# On Ollama server, expose to network:
OLLAMA_HOST=0.0.0.0:11434 ollama serve

# On Bytebot machine:
OLLAMA_URL=http://192.168.1.100:11434
```

**Docker Host:**
```bash
OLLAMA_URL=http://host.docker.internal:11434
```

## Example: Auto-Generated Configuration

After running `setup-ollama.sh`, `litellm-config.yaml` will contain:

```yaml
model_list:
  # ... existing models ...

  # Ollama VLM models (auto-discovered on 2025-10-26 14:30:00)
  - model_name: local-ollama-llava-latest
    litellm_params:
      model: ollama_chat/llava:latest
      api_base: http://localhost:11434
      supports_function_calling: true
    model_info:
      supports_vision: true

  - model_name: local-ollama-llava-13b
    litellm_params:
      model: ollama_chat/llava:13b
      api_base: http://localhost:11434
      supports_function_calling: true
    model_info:
      supports_vision: true

  - model_name: local-ollama-llava-34b
    litellm_params:
      model: ollama_chat/llava:34b
      api_base: http://localhost:11434
      supports_function_calling: true
    model_info:
      supports_vision: true

  - model_name: local-ollama-qwen2-vl-7b
    litellm_params:
      model: ollama_chat/qwen2-vl:7b
      api_base: http://localhost:11434
      supports_function_calling: true
    model_info:
      supports_vision: true
```

## Recommended Models

### Best for Computer Use

**Llava 1.6 - 34B**
- **Size:** 34B parameters (~20GB disk, ~22GB RAM)
- **Strengths:** Excellent UI understanding, accurate clicking
- **Speed:** Medium (3-5s/inference on GPU)
- **Download:** `ollama pull llava:34b`

**Llava 1.6 - 13B**
- **Size:** 13B parameters (~8GB disk, ~10GB RAM)
- **Strengths:** Good balance of speed and accuracy
- **Speed:** Fast (1-2s/inference on GPU)
- **Download:** `ollama pull llava:13b`

**Qwen2-VL - 7B**
- **Size:** 7B parameters (~5GB disk, ~6GB RAM)
- **Strengths:** Strong vision-language understanding
- **Speed:** Very fast (<1s/inference on GPU)
- **Download:** `ollama pull qwen2-vl:7b`

**MiniCPM-V**
- **Size:** 8B parameters (~6GB disk, ~7GB RAM)
- **Strengths:** Efficient, good UI reasoning
- **Speed:** Fast (1-2s/inference on GPU)
- **Download:** `ollama pull minicpm-v:latest`

### Hardware Requirements

| Model | Disk Space | RAM (GPU) | Recommended GPU | Speed |
|-------|-----------|-----------|-----------------|-------|
| Llava 7B | 4GB | 6GB | RTX 3060+ | Very Fast |
| Llava 13B | 8GB | 10GB | RTX 3080+ | Fast |
| Llava 34B | 20GB | 22GB | RTX 4090, A6000 | Medium |
| Qwen2-VL 7B | 5GB | 6GB | RTX 3060+ | Very Fast |
| MiniCPM-V 8B | 6GB | 7GB | RTX 3060+ | Fast |

**CPU-Only:** Ollama works on CPU but is significantly slower (10-30s/inference).

## Troubleshooting

### "Cannot connect to Ollama"

**Check:**
1. Ollama is running: `ollama list`
2. Service is accessible: `curl http://localhost:11434/api/tags`
3. Port 11434 is not blocked by firewall
4. If using remote Ollama, check network connectivity

**Test manually:**
```bash
curl http://localhost:11434/api/tags
```

### "No VLM models found"

**Cause:** Only text-only models are installed

**Solution:**
1. Download VLM models:
   ```bash
   ollama pull llava:latest
   ollama pull llava:13b
   ollama pull qwen2-vl:7b
   ```
2. Verify models: `ollama list`
3. Rerun: `./scripts/setup-ollama.sh`

### Models not appearing in UI

**Check:**
1. Restart entire stack: `./scripts/stop-stack.sh && ./scripts/start-stack.sh`
2. Verify models in `packages/bytebot-llm-proxy/litellm-config.yaml`
3. Check proxy logs: `docker logs bytebot-llm-proxy`
4. Verify `BYTEBOT_LLM_PROXY_URL` is set in `.env.defaults`

### Slow inference

**Solutions:**
1. Use smaller model (Llava 7B instead of 34B)
2. Enable GPU acceleration (Ollama auto-detects)
3. Use quantized models: `ollama pull llava:13b-q4_0`
4. Check GPU is being used: `nvidia-smi` or `watch -n1 nvidia-smi`

### Out of Memory (OOM)

**Solutions:**
1. Use smaller model
2. Close other GPU-intensive applications
3. Reduce Ollama context size:
   ```bash
   # In Ollama Modelfile
   PARAMETER num_ctx 2048  # Default is 4096
   ```

## Advanced Usage

### Manual Model Configuration

If auto-discovery doesn't work, manually add to `litellm-config.yaml`:

```yaml
  - model_name: my-custom-vlm
    litellm_params:
      model: ollama_chat/my-model-name
      api_base: http://localhost:11434
      supports_function_calling: true
    model_info:
      supports_vision: true
```

### Multiple Ollama Servers

Configure multiple Ollama instances:

```yaml
  # Server 1 (local)
  - model_name: local-ollama-llava-7b
    litellm_params:
      model: ollama_chat/llava:7b
      api_base: http://localhost:11434

  # Server 2 (remote GPU server)
  - model_name: remote-ollama-llava-34b
    litellm_params:
      model: ollama_chat/llava:34b
      api_base: http://192.168.1.100:11434
```

### Re-Discovery

Models change frequently. Re-run discovery anytime:

```bash
./scripts/setup-ollama.sh
# Old auto-discovered models are replaced
# Manually added models are preserved
```

### Custom Model Parameters

Customize Ollama model parameters using Modelfiles:

```bash
# Create custom Modelfile
cat > ~/Modelfile <<EOF
FROM llava:13b
PARAMETER temperature 0.7
PARAMETER num_ctx 4096
PARAMETER top_p 0.9
EOF

# Create custom model
ollama create my-llava-custom -f ~/Modelfile

# Pull into Bytebot
./scripts/setup-ollama.sh
```

## Performance Comparison

### Ollama vs LMStudio vs Cloud

| Metric | Ollama (Local) | LMStudio (Local) | Cloud API |
|--------|---------------|-----------------|-----------|
| **Latency** | 1-5s per request | 2-10s per request | 1-3s per request |
| **Setup** | ✅ Very easy (one command) | ⚠️ GUI-based | ✅ Just API key |
| **Privacy** | ✅ 100% local | ✅ 100% local | ❌ Data sent externally |
| **Cost** | ✅ Free (after GPU) | ✅ Free (after GPU) | 💰 Per-request pricing |
| **Model Choice** | Ollama library | LMStudio library | All available models |
| **Offline** | ✅ Works offline | ✅ Works offline | ❌ Requires internet |

**Recommendation:**
- **Use Ollama for:** Easy setup, CLI workflows, automation, Docker/Kubernetes
- **Use LMStudio for:** GUI preference, Windows users, model experimentation
- **Use Cloud for:** Speed, variety, latest models

## Ollama vs LMStudio

| Feature | Ollama | LMStudio |
|---------|--------|----------|
| **Interface** | CLI + API | GUI + API |
| **Model Format** | GGUF | GGUF |
| **Installation** | One command | Download app |
| **Model Download** | `ollama pull` | GUI download |
| **Auto-Updates** | ✅ Yes | ⚠️ Manual |
| **Docker Support** | ✅ Native | ⚠️ Via network |
| **Kubernetes** | ✅ Easy | ❌ Difficult |
| **Best For** | Servers, automation | Desktops, experimentation |

## FAQ

**Q: Can I use Ollama on a different machine?**

A: Yes! Run Ollama on any machine with GPU and point `OLLAMA_URL` to it.

**Q: How many models can I add?**

A: Unlimited. Each model appears in the UI dropdown.

**Q: Do Ollama models support function calling?**

A: Yes! Most VLMs support function calling through Ollama's OpenAI-compatible API.

**Q: Can I use non-VLM models from Ollama?**

A: You can manually add them to `litellm-config.yaml`, but they won't work for computer use tasks (require vision).

**Q: What if Ollama changes port?**

A: Set `OLLAMA_HOST` environment variable before starting Ollama, or edit `OLLAMA_URL` in `.env.defaults`.

**Q: How do I remove Ollama models?**

A: Edit `packages/bytebot-llm-proxy/litellm-config.yaml` and delete the auto-generated section, then restart.

**Q: Can I run Ollama in Docker?**

A: Yes! Use the official Ollama Docker image:
```bash
docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

**Q: How do I update Ollama models?**

A: Pull the latest version:
```bash
ollama pull llava:latest
./scripts/setup-ollama.sh  # Re-discover
```

## Resources

- [Ollama Official Website](https://ollama.com)
- [Ollama Documentation](https://github.com/ollama/ollama/tree/main/docs)
- [Ollama Model Library](https://ollama.com/library)
- [VLM Models on Ollama](https://ollama.com/search?c=vision)
- [Bytebot Model Configuration](../packages/bytebot-llm-proxy/litellm-config.yaml)

## Support

For issues:
1. Check troubleshooting section above
2. Verify Ollama logs: `journalctl -u ollama` (Linux) or console output
3. Review Bytebot proxy logs: `docker logs bytebot-llm-proxy`
4. Open GitHub issue with configuration details

## Comparison: When to Use Ollama

**Choose Ollama if:**
- ✅ You prefer CLI tools over GUI
- ✅ You're running on Linux servers
- ✅ You want easy Docker/Kubernetes deployment
- ✅ You want automatic model updates
- ✅ You value simplicity and minimal setup

**Choose LMStudio if:**
- ✅ You prefer GUI interfaces
- ✅ You're on Windows/macOS desktop
- ✅ You want visual model management
- ✅ You want to experiment with model parameters
- ✅ You need detailed inference statistics
