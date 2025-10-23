# OmniBox Adapter - Windows Desktop Control Service

NestJS service that provides a bytebotd-compatible API for controlling Windows desktop via OmniBox.

## Architecture

```
bytebot-agent
    ↓ HTTP (same API as bytebotd)
omnibox-adapter (:5001)
    ↓ HTTP
OmniBox Computer Use API (:5000)
    ↓ PyAutoGUI
Windows 11 Desktop
```

## Features

- **Drop-in replacement** for bytebotd on Windows
- **Same API** as bytebotd - no agent changes needed
- **PyAutoGUI-based** desktop control via OmniBox
- **Windows-specific** keyboard mappings and app launching
- **OmniParser integration** for CV-based element detection

## API Endpoints

### Computer Use

**POST /computer-use**
```json
{
  "action": "click_mouse",
  "coordinates": { "x": 640, "y": 360 },
  "button": "left",
  "clickCount": 1
}
```

Supported actions:
- `screenshot` - Capture screen
- `click_mouse` - Click at coordinates
- `move_mouse` - Move cursor
- `type_text` - Type text
- `press_keys` - Press keyboard shortcut
- `scroll` - Scroll up/down
- `wait` - Pause execution

## Configuration

Environment variables:

```bash
# OmniBox API endpoint
OMNIBOX_URL=http://omnibox:5000

# Service port
PORT=5001

# OmniParser integration
BYTEBOT_CV_USE_OMNIPARSER=true
OMNIPARSER_URL=http://bytebot-omniparser:9989
```

## Usage

### Standalone (Development)

```bash
cd packages/omnibox-adapter
npm install
npm run start:dev
```

### Docker (Production)

```bash
# Start omnibox-adapter with OmniBox
docker compose --profile omnibox up -d omnibox omnibox-adapter
```

## Platform Selection

To use Windows desktop instead of Linux:

```bash
# In docker/.env
BYTEBOT_DESKTOP_PLATFORM=windows
BYTEBOT_DESKTOP_WINDOWS_URL=http://omnibox-adapter:5001
```

## Windows-Specific Features

### Keyboard Shortcuts
- `Win` - Start menu
- `Win+E` - File Explorer
- `Win+R` - Run dialog
- `Alt+Tab` - Switch windows
- `Win+D` - Show desktop

### Application Launcher
```json
{
  "action": "application",
  "name": "Microsoft Edge"
}
```

Launches apps via Start menu search.

## Development

```bash
# Build
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## Integration with Bytebot Agent

The adapter provides the same API as bytebotd, so no agent changes are needed:

```typescript
// Agent uses same code for both Linux and Windows
const response = await fetch(`${DESKTOP_URL}/computer-use`, {
  method: 'POST',
  body: JSON.stringify({
    action: 'screenshot'
  })
});
```

Platform is selected via `BYTEBOT_DESKTOP_PLATFORM` environment variable.

## Troubleshooting

**Connection refused:**
- Ensure OmniBox is running: `docker ps | grep omnibox`
- Check OmniBox API: `curl http://localhost:5000/health`

**Slow response:**
- Windows VM may need more resources (increase RAM/CPU in docker-compose.yml)
- Check VM status via web viewer: http://localhost:8006

**Actions not working:**
- Verify PyAutoGUI server is running inside Windows VM
- Check OmniBox logs: `docker logs bytebot-omnibox`

## License

MIT
