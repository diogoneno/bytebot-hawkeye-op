#!/bin/bash
# OmniBox Setup Script - Windows 11 Desktop Environment
# Sets up OmniBox for Windows desktop agent testing

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OMNIBOX_DIR="$PROJECT_ROOT/packages/omnibox"

log_info "======================================"
log_info "  OmniBox Windows 11 Setup"
log_info "======================================"
echo ""

# Check prerequisites
log_info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    log_error "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    log_error "Docker Compose is not available"
    exit 1
fi

# Check KVM (Linux only)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    log_info "Checking KVM virtualization support..."
    if ! lsmod | grep -q kvm; then
        log_warn "KVM module not loaded"
        log_info "Attempting to load KVM module..."
        sudo modprobe kvm 2>/dev/null || true
        if grep -q "Intel" /proc/cpuinfo; then
            sudo modprobe kvm_intel 2>/dev/null || true
        elif grep -q "AMD" /proc/cpuinfo; then
            sudo modprobe kvm_amd 2>/dev/null || true
        fi

        if ! lsmod | grep -q kvm; then
            log_error "KVM virtualization not available"
            log_error "OmniBox requires KVM for Windows VM"
            log_error "Enable virtualization in BIOS and ensure kvm kernel module is available"
            exit 1
        fi
    fi
    log_info "✓ KVM virtualization available"
fi

# Check disk space
log_info "Checking disk space..."
AVAILABLE_SPACE=$(df -BG "$OMNIBOX_DIR" | awk 'NR==2 {print $4}' | sed 's/G//')
REQUIRED_SPACE=35

if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
    log_warn "Low disk space: ${AVAILABLE_SPACE}GB available, ${REQUIRED_SPACE}GB recommended"
    log_warn "OmniBox requires ~30GB for Windows 11 VM"
fi

# Create directories
log_info "Creating OmniBox directories..."
mkdir -p "$OMNIBOX_DIR/iso"
mkdir -p "$OMNIBOX_DIR/oem"
mkdir -p "$OMNIBOX_DIR/setup"

# Check for Windows ISO
log_info "Checking for Windows 11 ISO..."
if [ ! -f "$OMNIBOX_DIR/iso/custom.iso" ]; then
    log_warn "Windows 11 ISO not found at $OMNIBOX_DIR/iso/custom.iso"
    echo ""
    log_info "To use OmniBox with a custom Windows 11 installation:"
    log_info "1. Download Windows 11 Enterprise Evaluation from:"
    log_info "   https://www.microsoft.com/en-us/evalcenter/evaluate-windows-11-enterprise"
    log_info "2. Place the ISO file at: $OMNIBOX_DIR/iso/custom.iso"
    echo ""
    log_info "Alternatively, OmniBox will download Windows automatically on first run."
    echo ""
else
    log_info "✓ Windows 11 ISO found"
fi

# Pull Docker image
log_info "Pulling OmniBox Windows container image..."
log_info "This may take several minutes..."
docker pull dockurr/windows:latest || {
    log_error "Failed to pull OmniBox image"
    log_error "Check your internet connection and Docker installation"
    exit 1
}

log_info "✓ OmniBox image ready"

# Update .env file
ENV_FILE="$PROJECT_ROOT/docker/.env"
log_info "Updating environment configuration..."

if [ ! -f "$ENV_FILE" ]; then
    touch "$ENV_FILE"
fi

# Add OmniBox configuration if not present
if ! grep -q "OMNIBOX_RAM_SIZE" "$ENV_FILE"; then
    cat >> "$ENV_FILE" << EOF

# OmniBox Windows 11 Configuration
OMNIBOX_RAM_SIZE=8G
OMNIBOX_CPU_CORES=4
OMNIBOX_DISK_SIZE=64G
EOF
    log_info "✓ Added OmniBox configuration to .env"
fi

echo ""
log_info "======================================"
log_info "  Setup Complete!"
log_info "======================================"
echo ""
log_info "Next steps:"
echo ""
log_info "1. Start OmniBox (Windows desktop):"
log_info "   docker compose --profile omnibox up -d omnibox"
echo ""
log_info "2. Access Windows desktop:"
log_info "   Web Viewer: http://localhost:8006"
log_info "   VNC: vnc://localhost:5900"
log_info "   RDP: rdp://localhost:3389"
echo ""
log_info "3. Computer Use API:"
log_info "   http://localhost:5000"
echo ""
log_info "Note: First boot takes 5-10 minutes for Windows installation"
echo ""
log_info "For management commands, see:"
log_info "   packages/omnibox/scripts/manage_vm.sh"
echo ""
