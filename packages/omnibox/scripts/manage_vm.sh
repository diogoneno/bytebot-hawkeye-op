#!/bin/bash
# OmniBox VM Management Script
# Based on Microsoft OmniParser manage_vm.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored message
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker Desktop."
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose is not installed."
        exit 1
    fi

    # Check KVM (Linux only)
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if ! lsmod | grep -q kvm; then
            log_warn "KVM module not loaded. OmniBox requires KVM for virtualization."
            log_warn "Try: sudo modprobe kvm && sudo modprobe kvm_intel  # or kvm_amd"
        fi
    fi

    log_info "Prerequisites check passed"
}

# Wait for API to be ready
wait_for_api() {
    log_info "Waiting for Computer Use API to be ready..."

    local max_retries=60  # 5 minutes (5 seconds * 60)
    local retry_count=0

    while [ $retry_count -lt $max_retries ]; do
        if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
            log_info "✓ Computer Use API is ready!"
            return 0
        fi

        retry_count=$((retry_count + 1))
        echo -n "."
        sleep 5
    done

    log_error "API did not become ready within timeout"
    return 1
}

# Create and start VM
create_vm() {
    check_prerequisites

    log_info "Creating OmniBox Windows 11 VM..."

    # Check if Windows ISO exists
    if [ ! -f "$PROJECT_ROOT/iso/custom.iso" ]; then
        log_warn "Windows 11 ISO not found at $PROJECT_ROOT/iso/custom.iso"
        log_warn "Please download Windows 11 Enterprise Evaluation from:"
        log_warn "https://www.microsoft.com/en-us/evalcenter/evaluate-windows-11-enterprise"
        log_warn "and place it at $PROJECT_ROOT/iso/custom.iso"
        log_warn ""
        log_info "Continuing anyway (will use downloaded image)..."
    fi

    # Build or pull image
    log_info "Pulling/building Windows container image..."
    docker compose -f "$COMPOSE_FILE" pull || docker compose -f "$COMPOSE_FILE" build

    # Start containers
    log_info "Starting OmniBox container..."
    docker compose -f "$COMPOSE_FILE" up -d

    # Wait for API
    wait_for_api

    log_info "✓ OmniBox VM created successfully!"
    log_info "  Web Viewer: http://localhost:8006"
    log_info "  VNC: localhost:5900"
    log_info "  RDP: localhost:3389"
    log_info "  API: http://localhost:5000"
}

# Start existing VM
start_vm() {
    check_prerequisites

    log_info "Starting OmniBox VM..."
    docker compose -f "$COMPOSE_FILE" start

    wait_for_api

    log_info "✓ OmniBox VM started successfully!"
}

# Stop VM
stop_vm() {
    log_info "Stopping OmniBox VM..."
    docker compose -f "$COMPOSE_FILE" stop
    log_info "✓ OmniBox VM stopped"
}

# Delete VM (WARNING: destroys all data)
delete_vm() {
    log_warn "This will DELETE all VM data. Are you sure? (yes/no)"
    read -r response
    if [ "$response" != "yes" ]; then
        log_info "Cancelled"
        exit 0
    fi

    log_info "Deleting OmniBox VM..."
    docker compose -f "$COMPOSE_FILE" down -v
    log_info "✓ OmniBox VM deleted"
}

# Show VM status
status_vm() {
    log_info "OmniBox VM Status:"
    docker compose -f "$COMPOSE_FILE" ps

    echo ""
    log_info "Testing API connection..."
    if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
        log_info "✓ API is responding"
    else
        log_warn "✗ API is not responding"
    fi
}

# Show logs
logs_vm() {
    docker compose -f "$COMPOSE_FILE" logs -f
}

# Main
case "${1:-}" in
    create)
        create_vm
        ;;
    start)
        start_vm
        ;;
    stop)
        stop_vm
        ;;
    delete)
        delete_vm
        ;;
    status)
        status_vm
        ;;
    logs)
        logs_vm
        ;;
    *)
        echo "Usage: $0 {create|start|stop|delete|status|logs}"
        echo ""
        echo "Commands:"
        echo "  create  - Create and start the OmniBox VM"
        echo "  start   - Start existing OmniBox VM"
        echo "  stop    - Stop running OmniBox VM"
        echo "  delete  - Delete OmniBox VM (WARNING: destroys all data)"
        echo "  status  - Show VM status"
        echo "  logs    - Show VM logs"
        exit 1
        ;;
esac
