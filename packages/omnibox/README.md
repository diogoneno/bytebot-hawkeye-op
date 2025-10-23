# OmniBox - Windows 11 Desktop Agent Environment

OmniBox is a lightweight Windows 11 VM in Docker from Microsoft's OmniParser project, designed for AI agent testing and automation.

## Features

- **50% smaller** than traditional Windows VMs (30GB vs 60GB+)
- **Computer Use API** on port 5000 for programmatic desktop control
- **VNC Access** on port 5900 for visual debugging
- **PyAutoGUI integration** for mouse/keyboard automation
- **Pre-configured** Windows 11 Enterprise environment

## Prerequisites

- Docker Desktop with KVM support (Linux/WSL2)
- ~30GB free disk space
- Windows 11 Enterprise Evaluation ISO

## Setup

### 1. Get Windows 11 ISO

Download Windows 11 Enterprise Evaluation from Microsoft:
```bash
# Place the ISO in packages/omnibox/iso/custom.iso
mkdir -p packages/omnibox/iso
# Download from: https://www.microsoft.com/en-us/evalcenter/evaluate-windows-11-enterprise
# Rename to custom.iso
```

### 2. Build OmniBox Image

```bash
# Using Microsoft's pre-built image (recommended)
docker pull dockurr/windows:latest

# OR build from source
cd packages/omnibox
docker build -t omni-windows .
```

### 3. Start OmniBox

```bash
# Using docker-compose (from project root)
docker compose -f docker/docker-compose.yml up -d omnibox

# OR using the management script
cd packages/omnibox
./scripts/manage_vm.sh create
./scripts/manage_vm.sh start
```

### 4. Access Windows Desktop

**VNC Viewer:** Connect to `localhost:5900`

**Web Viewer:** Open `http://localhost:8006`

## Computer Use API

OmniBox exposes HTTP endpoints for programmatic control:

### POST /execute
Execute Python commands via PyAutoGUI:

```bash
curl -X POST http://localhost:5000/execute \
  -H "Content-Type: application/json" \
  -d '{"command": ["python", "-c", "import pyautogui; pyautogui.click(640, 360)"]}'
```

### GET /screenshot
Capture current screen state:

```bash
curl http://localhost:5000/screenshot > screenshot.png
```

## Integration with Bytebot

OmniBox integrates with Bytebot through the **omnibox-adapter** service, which provides a bytebotd-compatible API:

```
bytebot-agent
    ↓
omnibox-adapter (port 5001)
    ↓
OmniBox HTTP API (port 5000)
    ↓
Windows 11 Desktop
```

See `packages/omnibox-adapter/README.md` for details.

## Management Commands

```bash
# Start VM
./scripts/manage_vm.sh start

# Stop VM
./scripts/manage_vm.sh stop

# Delete VM (WARNING: destroys all data)
./scripts/manage_vm.sh delete
```

## Architecture

```
┌─────────────────────────────────────┐
│  OmniBox Docker Container           │
│  ┌───────────────────────────────┐  │
│  │  Windows 11 Enterprise VM     │  │
│  │  - QEMU/KVM virtualization    │  │
│  │  - PyAutoGUI server           │  │
│  │  - HTTP API (:5000)           │  │
│  │  - VNC server (:5900)         │  │
│  │  - Web viewer (:8006)         │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Supported Actions

- **Mouse:** left_click, right_click, double_click, mouse_move, drag, hover
- **Keyboard:** type, hotkey (Ctrl+C, Win+R, etc.)
- **Screen:** screenshot, cursor_position
- **Navigation:** scroll_up, scroll_down, wait

## Troubleshooting

**VM won't start:**
- Ensure KVM is enabled: `lsmod | grep kvm`
- Check Docker has privileges: `docker run --privileged`

**Slow performance:**
- Increase allocated RAM in compose.yml (default: 8G)
- Use GPU passthrough if available
- Ensure SSD storage for VM disk

**API not responding:**
- Check container logs: `docker logs omnibox`
- Verify port 5000 is accessible: `curl http://localhost:5000/health`
- Wait for VM boot (can take 2-3 minutes)

## Resources

- [Microsoft OmniParser OmniBox](https://github.com/microsoft/OmniParser/tree/master/omnitool/omnibox)
- [Windows Container Documentation](https://github.com/dockur/windows)
- [PyAutoGUI Documentation](https://pyautogui.readthedocs.io/)

## License

OmniBox is based on Microsoft's OmniParser project. See upstream license for details.
