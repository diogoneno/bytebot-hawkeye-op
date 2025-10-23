# OmniBox Windows Desktop Integration Guide

Complete guide for using Bytebot Hawkeye with Windows 11 desktop via OmniBox.

## Overview

Bytebot Hawkeye now supports **dual desktop environments**:
- **Linux Desktop** (default) - via bytebotd
- **Windows 11 Desktop** (new) - via OmniBox + omnibox-adapter

Both platforms use the same Bytebot agent, OmniParser for CV-based element detection, and Smart Focus system. Platform selection is controlled via environment variables.

## Architecture

```
┌──────────────────────────────────────────────────┐
│  bytebot-agent (Task Orchestration)              │
│  ├─ LLM integration (Claude, GPT)                │
│  ├─ Smart Focus System                           │
│  ├─ CV-First clicking (89% accuracy)             │
│  └─ Platform router                              │
└───────────┬──────────────────────────────────────┘
            │
      ┌─────┴─────┐
      ↓           ↓
┌─────────────┐ ┌──────────────────────────┐
│  bytebotd   │ │  omnibox-adapter         │
│  (Linux)    │ │  (Windows adapter)       │
│  Port 9990  │ │  Port 5001               │
└─────────────┘ └──────┬───────────────────┘
                       ↓
              ┌────────────────────┐
              │  OmniBox (Win11 VM)│
              │  Port 5000         │
              └─────────┬──────────┘
                        ↓
          ┌─────────────┴────────────────┐
          │  bytebot-omniparser (shared) │
          │  YOLOv8 + Florence-2 + OCR   │
          │  Port 9989                   │
          └──────────────────────────────┘
```

## Quick Start

### 1. Setup OmniBox

```bash
# Run setup script
./scripts/setup-omnibox.sh

# This will:
# - Check prerequisites (Docker, KVM)
# - Pull Windows container image
# - Create directory structure
# - Configure environment
```

### 2. Start Windows Desktop Stack

```bash
# Start OmniBox + adapter (includes omniparser)
docker compose --profile omnibox up -d

# Services started:
# - omnibox: Windows 11 VM
# - omnibox-adapter: Windows control service
# - bytebot-omniparser: CV detection (shared)
# - bytebot-agent: Task orchestration
# - postgres: Database
# - bytebot-ui: Web interface
```

### 3. Configure Platform Selection

```bash
# Edit docker/.env.defaults
BYTEBOT_DESKTOP_PLATFORM=windows  # Change from 'linux' to 'windows'
```

### 4. Restart Agent

```bash
# Restart to pick up new platform
docker compose restart bytebot-agent
```

### 5. Access Windows Desktop

**Web Viewer:** http://localhost:8006
**VNC:** vnc://localhost:5900
**RDP:** rdp://localhost:3389
**API:** http://localhost:5000

### 6. Test Integration

Open Bytebot UI: http://localhost:9992

Create a test task:
```
Open Microsoft Edge and navigate to google.com
```

The agent will now control the Windows 11 desktop!

## Platform Configuration

### Environment Variables

```bash
# docker/.env.defaults

# Platform Selection
BYTEBOT_DESKTOP_PLATFORM=windows  # 'linux' or 'windows'

# Desktop URLs (auto-configured)
BYTEBOT_DESKTOP_LINUX_URL=http://bytebot-desktop:9990
BYTEBOT_DESKTOP_WINDOWS_URL=http://omnibox-adapter:5001

# OmniBox VM Resources
OMNIBOX_RAM_SIZE=8G      # Increase for better performance
OMNIBOX_CPU_CORES=4      # Increase if available
OMNIBOX_DISK_SIZE=64G    # Windows installation size
```

### Platform Switching

Switch between Linux and Windows without rebuilding:

**Recommended: Use start-stack.sh (interactive selection)**
```bash
./scripts/start-stack.sh
# Select platform when prompted
```

**Manual: Edit .env.defaults directly**
```bash
# Edit docker/.env.defaults
BYTEBOT_DESKTOP_PLATFORM=windows  # or 'linux'

# Restart stack
./scripts/stop-stack.sh
./scripts/start-stack.sh
```

## Windows-Specific Features

### Keyboard Shortcuts

The omnibox-adapter supports Windows-specific shortcuts:

| Shortcut | Action |
|----------|--------|
| `Win` | Open Start menu |
| `Win+E` | File Explorer |
| `Win+R` | Run dialog |
| `Win+D` | Show desktop |
| `Alt+Tab` | Switch windows |
| `Ctrl+Shift+Esc` | Task Manager |

Example agent request:
```
Press Win+E to open File Explorer
```

### Application Launching

Apps are launched via Start menu search:

```python
# Agent action
{
  "action": "application",
  "name": "Microsoft Edge"
}
```

The adapter will:
1. Open Start menu (Win key)
2. Type app name
3. Press Enter

### Supported Actions

All bytebotd actions work on Windows:

- ✅ `screenshot` - Capture screen
- ✅ `click_mouse` - Click at coordinates
- ✅ `move_mouse` - Move cursor
- ✅ `type_text` - Type text (with special char support)
- ✅ `press_keys` - Keyboard shortcuts
- ✅ `scroll` - Mouse wheel scroll
- ✅ `application` - Launch apps via Start menu
- ✅ `wait` - Delay execution
- ✅ `screen_info` - Get screen dimensions

## OmniParser on Windows

OmniParser provides the same 89% click accuracy on Windows as on Linux:

```
Agent → computer_detect_elements({ description: "Install button" })
     ↓ OmniParser detects UI elements
     ↓ Returns element IDs with coordinates
Agent → computer_click_element({ element_id: "omniparser_5" })
     ↓ Adapter clicks on Windows desktop
     ✓ Success!
```

**No agent changes needed** - the same CV-first workflow works across platforms.

## Troubleshooting

### OmniBox Won't Start

**Issue:** Container exits immediately

**Solution:**
```bash
# Check KVM is loaded (Linux only)
lsmod | grep kvm

# Load KVM if missing
sudo modprobe kvm
sudo modprobe kvm_intel  # or kvm_amd
```

**Issue:** "Device or resource busy"

**Solution:**
```bash
# Ensure no other VM software is using KVM
sudo systemctl stop libvirtd
```

### Windows VM Slow

**Issue:** High latency, slow response

**Solutions:**
1. Increase RAM:
   ```bash
   # docker/.env.defaults
   OMNIBOX_RAM_SIZE=12G  # or 16G
   ```

2. Increase CPU cores:
   ```bash
   # docker/.env.defaults
   OMNIBOX_CPU_CORES=6  # or 8
   ```

3. Use SSD storage for Docker volumes

4. Enable GPU passthrough (advanced)

### API Connection Errors

**Issue:** "Failed to connect to OmniBox API"

**Check:**
```bash
# Test OmniBox API
curl http://localhost:5000/health

# Test adapter
curl http://localhost:5001/computer-use

# Check logs
docker logs bytebot-omnibox
docker logs bytebot-omnibox-adapter
```

**Solution:**
```bash
# Restart services in order
docker compose restart omnibox
sleep 30  # Wait for Windows to boot
docker compose restart omnibox-adapter
docker compose restart bytebot-agent
```

### Screenshots Failing

**Issue:** Screenshot returns empty or error

**Solution:**
```bash
# Verify Windows VM is fully booted
# Check web viewer: http://localhost:8006
# Should show Windows desktop, not boot screen

# If stuck at boot, increase timeout:
# docker-compose.yml
healthcheck:
  start_period: 300s  # Increase from 120s
```

## Performance Benchmarks

### Screenshot Latency

| Platform | Latency | Notes |
|----------|---------|-------|
| Linux (bytebotd) | ~50-100ms | Native X11 |
| Windows (OmniBox) | ~200-400ms | HTTP + PyAutoGUI |

### Element Detection

| Platform | OmniParser Time | Total Time |
|----------|----------------|------------|
| Linux | ~0.6-1.6s | ~0.7-1.7s |
| Windows | ~0.6-1.6s | ~0.9-2.0s |

**Note:** OmniParser service is shared, so detection performance is equivalent. Windows adds ~200ms overhead for screenshot capture.

### Click Accuracy

| Method | Linux | Windows |
|--------|-------|---------|
| CV-assisted (computer_detect_elements) | 89% | 89% |
| Grid-based (manual coordinates) | 60% | 60% |
| Smart Focus (AI estimation) | 72% | 72% |

Accuracy is platform-independent as it depends on OmniParser, not desktop control layer.

## Advanced Configuration

### Custom Windows ISO

To use a specific Windows 11 build:

```bash
# 1. Download Windows 11 Enterprise Evaluation
#    https://www.microsoft.com/en-us/evalcenter/evaluate-windows-11-enterprise

# 2. Place ISO in packages/omnibox/iso/
mv ~/Downloads/Win11_EnterpriseEval.iso packages/omnibox/iso/custom.iso

# 3. Restart OmniBox
docker compose --profile omnibox down
docker compose --profile omnibox up -d
```

First boot will install Windows from ISO (~10-15 minutes).

### OEM Setup Scripts

Customize Windows first-boot setup:

```bash
# packages/omnibox/oem/setup.ps1
# Runs on first boot after Windows installation

# Install software
winget install Microsoft.VisualStudioCode
winget install Google.Chrome

# Configure settings
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name "AppsUseLightTheme" -Value 0
```

### GPU Passthrough

For better performance, pass through host GPU to Windows VM:

```yaml
# docker-compose.yml
omnibox:
  devices:
    - /dev/kvm
    - /dev/net/tun
    - /dev/dri  # Intel/AMD GPU
    # OR
    - /dev/nvidia0  # NVIDIA GPU
```

Requires host GPU drivers and proper IOMMU configuration.

## Comparison: Linux vs Windows

| Feature | Linux (bytebotd) | Windows (OmniBox) |
|---------|-----------------|-------------------|
| **Setup** | Simple (native) | Moderate (VM + adapter) |
| **Performance** | Fast (~50ms screenshot) | Moderate (~300ms screenshot) |
| **Resource Usage** | Low (~500MB RAM) | High (~8-12GB RAM for VM) |
| **Applications** | Linux apps (Firefox, VS Code, Terminal) | Windows apps (Edge, Office, Visual Studio) |
| **Use Cases** | Web apps, CLI tools, dev environments | Windows-specific apps, .NET, Office |
| **Click Accuracy** | 89% (CV-assisted) | 89% (CV-assisted) |
| **Maintenance** | Simple | Moderate (Windows updates) |

**Recommendation:**
- **Use Linux** for web-based tasks, development, automation
- **Use Windows** for Windows-specific apps, Office, .NET development

## FAQ

**Q: Can I run both Linux and Windows simultaneously?**

A: Yes! Run both stacks in parallel:
```bash
# Linux desktop (default profile)
docker compose up -d

# Windows desktop (omnibox profile)
docker compose --profile omnibox up -d

# Switch platform by changing BYTEBOT_DESKTOP_PLATFORM
```

**Q: Does SOM (Set-of-Mark) work on Windows?**

A: Yes! SOM numbered elements work identically on both platforms. The agent references elements by number (e.g., "click element 5"), and the adapter handles the actual click.

**Q: Can I use Windows RDP instead of VNC?**

A: Yes, connect via RDP for better performance:
```bash
# From Windows host
mstsc /v:localhost:3389

# From Linux host
rdesktop localhost:3389
```

**Q: How much disk space does OmniBox need?**

A: Initial setup: ~30GB (OS + apps). Configurable via `OMNIBOX_DISK_SIZE`.

**Q: Can I customize the Windows installation?**

A: Yes, use OEM scripts (packages/omnibox/oem/setup.ps1) for first-boot customization.

## Resources

- [OmniBox Source (Microsoft)](https://github.com/microsoft/OmniParser/tree/master/omnitool/omnibox)
- [dockurr/windows Docker Image](https://github.com/dockur/windows)
- [PyAutoGUI Documentation](https://pyautogui.readthedocs.io/)
- [Bytebot Hawkeye Documentation](../README.md)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review logs: `docker logs bytebot-omnibox-adapter`
3. Open issue with logs and configuration

## License

OmniBox integration uses Microsoft's OmniParser OmniBox (MIT License) and dockurr/windows (MIT License).
