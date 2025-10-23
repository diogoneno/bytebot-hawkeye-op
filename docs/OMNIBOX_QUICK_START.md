# OmniBox Quick Start - Windows Desktop in 5 Minutes

Get Bytebot Hawkeye running on Windows 11 desktop in 5 simple steps.

## Prerequisites

- Docker Desktop with KVM support (Linux) or WSL2 (Windows)
- 30GB free disk space
- 12GB+ RAM recommended

## Steps

### 1. Setup OmniBox

```bash
./scripts/setup-omnibox.sh
```

This pulls the Windows 11 container image (~5 minutes).

### 2. Start Windows Desktop

```bash
docker compose --profile omnibox up -d
```

This starts:
- Windows 11 VM (takes 3-5 minutes to boot on first run)
- OmniBox adapter service
- OmniParser CV service
- Bytebot agent & UI

### 3. Configure Platform

```bash
# Edit docker/.env
echo "BYTEBOT_DESKTOP_PLATFORM=windows" >> docker/.env

# Restart agent to pick up change
docker compose restart bytebot-agent
```

### 4. Verify Windows Desktop

Open web viewer: **http://localhost:8006**

You should see Windows 11 desktop.

### 5. Test with Bytebot

Open Bytebot UI: **http://localhost:9992**

Create a test task:
```
Open Microsoft Edge and search for "artificial intelligence"
```

Click "Start Task" and watch the agent control Windows!

## Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| **Bytebot UI** | http://localhost:9992 | Web interface |
| **Windows Viewer** | http://localhost:8006 | View Windows desktop |
| **VNC** | vnc://localhost:5900 | Alternative viewer |
| **RDP** | rdp://localhost:3389 | Native Windows Remote Desktop |

## Common Commands

```bash
# Start Windows desktop
docker compose --profile omnibox up -d

# Stop Windows desktop
docker compose --profile omnibox down

# View OmniBox logs
docker logs -f bytebot-omnibox

# View adapter logs
docker logs -f bytebot-omnibox-adapter

# Check Windows VM status
curl http://localhost:5000/health

# Switch back to Linux
echo "BYTEBOT_DESKTOP_PLATFORM=linux" >> docker/.env
docker compose restart bytebot-agent
```

## Troubleshooting

### OmniBox won't start

**Error:** `Cannot access KVM`

**Fix (Linux):**
```bash
sudo modprobe kvm
sudo modprobe kvm_intel  # or kvm_amd
```

### Windows VM is slow

**Fix:** Increase resources in `docker/.env.defaults`:
```bash
OMNIBOX_RAM_SIZE=12G     # Increase from 8G
OMNIBOX_CPU_CORES=6      # Increase from 4
```

Then restart:
```bash
docker compose --profile omnibox restart omnibox
```

### Agent can't connect to Windows

**Fix:** Wait for Windows to fully boot (check http://localhost:8006)

Windows boot takes 3-5 minutes on first run, 1-2 minutes on subsequent starts.

## Next Steps

- **Full Guide:** See [OMNIBOX_WINDOWS_INTEGRATION.md](./OMNIBOX_WINDOWS_INTEGRATION.md)
- **Platform Switching:** Switch between Linux and Windows as needed
- **Custom Setup:** Add Windows apps via OEM scripts
- **Performance Tuning:** GPU passthrough, resource allocation

## Example Tasks

Try these tasks with Windows desktop:

1. **Web Browsing:**
   ```
   Open Microsoft Edge and navigate to github.com
   ```

2. **File Management:**
   ```
   Open File Explorer and create a new folder called "test"
   ```

3. **Settings:**
   ```
   Open Windows Settings and navigate to Display settings
   ```

4. **Text Editing:**
   ```
   Open Notepad and type "Hello from Bytebot"
   ```

All tasks use CV-based element detection (89% accuracy) automatically!

## Architecture Diagram

```
User → Bytebot UI (localhost:9992)
         ↓
    bytebot-agent
         ↓
    omnibox-adapter (platform=windows)
         ↓
    OmniBox (Windows 11 VM)
         ↓
    OmniParser (CV detection - shared with Linux)
```

## Support

For detailed documentation, see:
- [Full Integration Guide](./OMNIBOX_WINDOWS_INTEGRATION.md)
- [OmniBox README](../packages/omnibox/README.md)
- [Adapter README](../packages/omnibox-adapter/README.md)
