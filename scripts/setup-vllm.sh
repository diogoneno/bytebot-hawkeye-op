#!/bin/bash
# vLLM VLM Auto-Discovery and Configuration
# Automatically detects Vision Language Models (VLMs) from vLLM and configures litellm proxy

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo ""
echo "======================================"
echo "  vLLM VLM Auto-Discovery"
echo "======================================"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Step 1: Ask for vLLM host/port
echo "vLLM serves OpenAI-compatible models from your local GPU/CPU server."
echo "Typical setup: vLLM running locally or on a separate machine with GPU."
echo ""
read -p "Enter vLLM host (IP or hostname) [localhost]: " VLLM_HOST
VLLM_HOST=${VLLM_HOST:-localhost}
read -p "Enter vLLM port [8000]: " VLLM_PORT
VLLM_PORT=${VLLM_PORT:-8000}
VLLM_URL="http://${VLLM_HOST}:${VLLM_PORT}"
VLLM_API_BASE="${VLLM_URL}/v1"

# Step 2: Optional API key
read -p "Enter vLLM API key (leave blank if not required): " VLLM_API_KEY_INPUT
VLLM_API_KEY_INPUT=${VLLM_API_KEY_INPUT:-}

if [ -n "$VLLM_API_KEY_INPUT" ]; then
    AUTH_HEADER=("-H" "Authorization: Bearer ${VLLM_API_KEY_INPUT}")
else
    AUTH_HEADER=()
fi

echo ""

# Step 3: Test connectivity
log_info "Testing connection to ${VLLM_API_BASE}/models..."
if ! curl -s -f -m 5 "${AUTH_HEADER[@]}" "${VLLM_API_BASE}/models" > /dev/null 2>&1; then
    log_error "Cannot connect to vLLM at ${VLLM_URL}"
    log_error "Please ensure:"
    log_error "  1. vLLM is running on ${VLLM_HOST}:${VLLM_PORT}"
    log_error "  2. The /v1/models endpoint is reachable"
    log_error "  3. Firewall allows connections"
    log_error "  4. API key is correct (if configured)"
    echo ""
    exit 1
fi

log_success "Connected to vLLM"
echo ""

# Step 4: Fetch available models
log_info "Fetching available models from vLLM..."
MODELS_JSON=$(curl -s "${AUTH_HEADER[@]}" "${VLLM_API_BASE}/models")

if [ -z "$MODELS_JSON" ] || [ "$MODELS_JSON" = "null" ]; then
    log_error "No response from vLLM /v1/models endpoint"
    exit 1
fi

# Step 5: Parse and filter VLMs
log_info "Filtering Vision Language Models (VLMs)..."

VLM_PATTERN='vl|vision|visual|multimodal|llava|qwen.*vl|qwen2.*vl|qwen2.*vision|internvl|idefics|cogvlm|glm-4|molmo|phi-3-vision|ui-tars'

if command -v jq &> /dev/null; then
    VLM_MODELS=$(echo "$MODELS_JSON" | jq -r --arg pattern "$VLM_PATTERN" '.data[]? | select(.id | test($pattern; "i")) | .id' 2>/dev/null)
else
    log_warn "jq not found, using grep (install jq for better reliability)"
    VLM_MODELS=$(echo "$MODELS_JSON" | grep -oP '"id":\s*"\K[^"]*' | grep -iE "$VLM_PATTERN")
fi

if [ -z "$VLM_MODELS" ]; then
    log_warn "No VLM models found on vLLM"
    log_warn ""
    log_warn "VLM models must have one of these in the name:"
    log_warn "  • vl (vision-language)"
    log_warn "  • vision / visual / multimodal"
    log_warn "  • llava, qwen-vl, qwen2-vl, internvl, idefics"
    log_warn "  • cogvlm, glm-4, molmo, phi-3-vision, ui-tars"
    echo ""
    log_info "Available models on vLLM:"
    if command -v jq &> /dev/null; then
        echo "$MODELS_JSON" | jq -r '.data[]? | .id' | while read -r model; do
            echo "  • $model"
        done
    else
        echo "$MODELS_JSON" | grep -oP '"id":\s*"\K[^"]*' | while read -r model; do
            echo "  • $model"
        done
    fi
    echo ""
    exit 0
fi

VLM_COUNT=$(echo "$VLM_MODELS" | wc -l | tr -d ' ')

log_success "Found ${VLM_COUNT} VLM model(s):"
echo "$VLM_MODELS" | while read -r model; do
    echo "  • $model"
done
echo ""

# Step 6: Generate litellm-config.yaml entries
CONFIG_FILE="$PROJECT_ROOT/packages/bytebot-llm-proxy/litellm-config.yaml"

if [ ! -f "$CONFIG_FILE" ]; then
    log_error "litellm-config.yaml not found at $CONFIG_FILE"
    exit 1
fi

BACKUP_FILE="${CONFIG_FILE}.backup.$(date +%s)"
log_info "Backing up existing config to ${BACKUP_FILE}..."
cp "$CONFIG_FILE" "$BACKUP_FILE"

TEMP_MODELS=$(mktemp)

echo "$VLM_MODELS" | while read -r model; do
    SAFE_NAME=$(echo "$model" | tr '/' '-' | tr ' ' '-' | tr '[:upper:]' '[:lower:]')

    cat >> "$TEMP_MODELS" << INNER_EOF
  - model_name: local-vllm-${SAFE_NAME}
    litellm_params:
      model: openai/${model}
      api_base: os.environ/VLLM_API_BASE
      api_key: os.environ/VLLM_API_KEY
      supports_function_calling: true
    model_info:
      supports_vision: true
INNER_EOF
done

# Step 7: Update litellm-config.yaml
log_info "Updating litellm-config.yaml..."

sed -i.tmp '/# vLLM VLM models (auto-discovered)/,/^litellm_settings:/{ /^litellm_settings:/!d; }' "$CONFIG_FILE"

sed -i.tmp '/# Add local models via vLLM/,/^litellm_settings:/{ /^litellm_settings:/!d; }' "$CONFIG_FILE"

TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
sed -i.tmp '/^litellm_settings:/i\  # vLLM VLM models (auto-discovered on '"${TIMESTAMP}"')' "$CONFIG_FILE"
sed -i.tmp "/# vLLM VLM models/r $TEMP_MODELS" "$CONFIG_FILE"

rm -f "${CONFIG_FILE}.tmp" "$TEMP_MODELS"

log_success "Added ${VLM_COUNT} VLM model(s) to litellm-config.yaml"
echo ""

# Step 8: Update .env.defaults with vLLM URL/API base
ENV_DEFAULTS_FILE="$PROJECT_ROOT/docker/.env.defaults"
ENV_FILE="$PROJECT_ROOT/docker/.env"

if [ -f "$ENV_DEFAULTS_FILE" ]; then
    if grep -q "^VLLM_URL=" "$ENV_DEFAULTS_FILE"; then
        sed -i.tmp "s|^VLLM_URL=.*|VLLM_URL=${VLLM_URL}|" "$ENV_DEFAULTS_FILE"
        rm -f "${ENV_DEFAULTS_FILE}.tmp"
        log_info "Updated VLLM_URL in .env.defaults"
    else
        echo "" >> "$ENV_DEFAULTS_FILE"
        echo "# vLLM Configuration (added by setup-vllm.sh)" >> "$ENV_DEFAULTS_FILE"
        echo "VLLM_URL=${VLLM_URL}" >> "$ENV_DEFAULTS_FILE"
        log_success "Added VLLM_URL to .env.defaults"
    fi

    if grep -q "^VLLM_API_BASE=" "$ENV_DEFAULTS_FILE"; then
        sed -i.tmp "s|^VLLM_API_BASE=.*|VLLM_API_BASE=${VLLM_API_BASE}|" "$ENV_DEFAULTS_FILE"
        rm -f "${ENV_DEFAULTS_FILE}.tmp"
        log_info "Updated VLLM_API_BASE in .env.defaults"
    else
        echo "VLLM_API_BASE=${VLLM_API_BASE}" >> "$ENV_DEFAULTS_FILE"
        log_success "Added VLLM_API_BASE to .env.defaults"
    fi

    if [ -n "$VLLM_API_KEY_INPUT" ]; then
        if grep -q "^VLLM_API_KEY=" "$ENV_DEFAULTS_FILE"; then
            sed -i.tmp "s|^VLLM_API_KEY=.*|VLLM_API_KEY=${VLLM_API_KEY_INPUT}|" "$ENV_DEFAULTS_FILE"
            rm -f "${ENV_DEFAULTS_FILE}.tmp"
            log_info "Updated VLLM_API_KEY in .env.defaults"
        else
            echo "VLLM_API_KEY=${VLLM_API_KEY_INPUT}" >> "$ENV_DEFAULTS_FILE"
            log_success "Added VLLM_API_KEY to .env.defaults"
        fi
    fi
else
    log_warn ".env.defaults file not found, skipping VLLM configuration"
fi

# Sync VLLM settings to .env
if [ -f "$ENV_FILE" ] && [ -f "$ENV_DEFAULTS_FILE" ]; then
    for VAR_NAME in VLLM_URL VLLM_API_BASE VLLM_API_KEY; do
        if grep -q "^${VAR_NAME}=" "$ENV_DEFAULTS_FILE"; then
            VAR_VALUE=$(grep "^${VAR_NAME}=" "$ENV_DEFAULTS_FILE" | cut -d= -f2-)
            if grep -q "^${VAR_NAME}=" "$ENV_FILE"; then
                sed -i.tmp "s|^${VAR_NAME}=.*|${VAR_NAME}=$VAR_VALUE|" "$ENV_FILE"
                rm -f "${ENV_FILE}.tmp"
            else
                echo "${VAR_NAME}=$VAR_VALUE" >> "$ENV_FILE"
            fi
            log_info "Synced ${VAR_NAME} to .env"
        fi
    done
fi

echo ""
log_success "========================================="
log_success "  vLLM Configuration Complete!"
log_success "========================================="
echo ""
log_info "Configured Models:"
echo "$VLM_MODELS" | while read -r model; do
    SAFE_NAME=$(echo "$model" | tr '/' '-' | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
    echo "  • local-vllm-${SAFE_NAME}"
done
echo ""
log_info "Next Steps:"
echo "  1. Restart the stack to load new models:"
echo "     ${BLUE}./scripts/stop-stack.sh && ./scripts/start-stack.sh${NC}"
echo ""
echo "  2. Models will appear in UI at: ${BLUE}http://localhost:9992${NC}"
echo ""
log_info "Backup saved: ${BACKUP_FILE}"
echo ""
