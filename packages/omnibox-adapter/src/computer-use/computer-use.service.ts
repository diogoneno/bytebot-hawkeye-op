import { Injectable, Logger } from '@nestjs/common';
import { OmniBoxClient } from './omnibox-client.service';
import {
  ComputerAction,
  ClickMouseAction,
  MoveMouseAction,
  TraceMouseAction,
  PressMouseAction,
  DragMouseAction,
  TypeTextAction,
  TypeKeysAction,
  PasteTextAction,
  PressKeysAction,
  ScrollAction,
  ApplicationAction,
  ScreenshotCustomRegionAction,
  ReadFileAction,
  WriteFileAction,
} from '@bytebot/shared';

/**
 * Computer Use Service for Windows Desktop via OmniBox
 *
 * Provides bytebotd-compatible API for desktop control on Windows.
 * Translates Bytebot actions to PyAutoGUI commands executed via OmniBox.
 */
@Injectable()
export class ComputerUseService {
  private readonly logger = new Logger(ComputerUseService.name);

  constructor(private readonly omniboxClient: OmniBoxClient) {}

  /**
   * Execute computer action
   */
  async action(params: ComputerAction): Promise<any> {
    this.logger.log(`Executing action: ${params.action}`);

    switch (params.action) {
      case 'screenshot':
        return this.screenshot();

      case 'click_mouse':
        return this.clickMouse(params as ClickMouseAction);

      case 'move_mouse':
        return this.moveMouse(params as MoveMouseAction);

      case 'trace_mouse':
        return this.traceMouse(params as TraceMouseAction);

      case 'press_mouse':
        return this.pressMouse(params as PressMouseAction);

      case 'drag_mouse':
        return this.dragMouse(params as DragMouseAction);

      case 'type_text':
        return this.typeText(params as TypeTextAction);

      case 'press_keys':
        return this.pressKeys(params as PressKeysAction);

      case 'type_keys':
        return this.typeKeys(params as TypeKeysAction);

      case 'paste_text':
        return this.pasteText(params as PasteTextAction);

      case 'scroll':
        return this.scroll(params as ScrollAction);

      case 'application':
        return this.launchApplication(params as ApplicationAction);

      case 'screenshot_custom_region':
        return this.screenshotCustomRegion(
          params as ScreenshotCustomRegionAction,
        );

      case 'screenshot_region':
        return this.screenshotRegion(params as any);

      case 'wait':
        return this.wait(params.duration || 500);

      case 'screen_info':
        return this.getScreenInfo();

      case 'cursor_position':
        return this.getCursorPosition();

      case 'read_file':
        return this.readFile(params as ReadFileAction);

      case 'write_file':
        return this.writeFile(params as WriteFileAction);

      default:
        throw new Error(`Unsupported action: ${(params as ComputerAction).action}`);
    }
  }

  /**
   * Capture screenshot
   */
  async screenshot(): Promise<{ image: string }> {
    const buffer = await this.omniboxClient.screenshot();
    const base64 = buffer.toString('base64');

    return {
      image: base64,
    };
  }

  /**
   * Click mouse at coordinates
   */
  async clickMouse(params: ClickMouseAction): Promise<void> {
    const { coordinates, button = 'left', clickCount = 1 } = params;

    if (!coordinates) {
      throw new Error('Click coordinates required');
    }

    const { x, y } = coordinates;

    // Map button names
    const buttonMap: Record<string, string> = {
      left: 'left',
      right: 'right',
      middle: 'middle',
    };

    const pyButton = buttonMap[button] || 'left';

    // PyAutoGUI click command
    let pythonCode: string;

    if (clickCount === 2) {
      // Double click
      pythonCode = this.omniboxClient.buildPyAutoGUICommand('doubleClick', {
        x,
        y,
        button: pyButton,
      });
    } else {
      // Single or multiple clicks
      pythonCode = this.omniboxClient.buildPyAutoGUICommand('click', {
        x,
        y,
        clicks: clickCount,
        button: pyButton,
      });
    }

    await this.omniboxClient.execute(pythonCode);

    this.logger.debug(
      `Clicked at (${x}, ${y}) with ${button} button, count: ${clickCount}`,
    );
  }

  /**
   * Move mouse to coordinates
   */
  async moveMouse(params: MoveMouseAction): Promise<void> {
    const { coordinates } = params;

    if (!coordinates) {
      throw new Error('Move coordinates required');
    }

    const { x, y } = coordinates;

    const pythonCode = this.omniboxClient.buildPyAutoGUICommand('moveTo', {
      x,
      y,
      duration: 0.2, // Smooth movement
    });

    await this.omniboxClient.execute(pythonCode);

    this.logger.debug(`Moved mouse to (${x}, ${y})`);
  }

  /**
   * Trace mouse along a path of coordinates
   */
  async traceMouse(params: TraceMouseAction): Promise<void> {
    const { path, holdKeys } = params;

    if (!path || path.length === 0) {
      throw new Error('Path required');
    }

    // Build Python code to trace the path
    const pathStr = path.map((coord) => `(${coord.x}, ${coord.y})`).join(', ');

    let pythonCode = `
import pyautogui
import time
pyautogui.FAILSAFE = False
`;

    // Hold keys if provided
    if (holdKeys && holdKeys.length > 0) {
      const mappedKeys = holdKeys.map((key) => this.mapKeyToPyAutoGUI(key));
      mappedKeys.forEach((key) => {
        pythonCode += `pyautogui.keyDown('${key}')\n`;
      });
    }

    // Move to first point
    pythonCode += `pyautogui.moveTo(${path[0].x}, ${path[0].y}, duration=0)\n`;

    // Trace the path
    path.slice(1).forEach((coord) => {
      pythonCode += `pyautogui.moveTo(${coord.x}, ${coord.y}, duration=0.1)\n`;
    });

    // Release hold keys
    if (holdKeys && holdKeys.length > 0) {
      const mappedKeys = holdKeys.map((key) => this.mapKeyToPyAutoGUI(key));
      mappedKeys.forEach((key) => {
        pythonCode += `pyautogui.keyUp('${key}')\n`;
      });
    }

    await this.omniboxClient.execute(pythonCode);

    this.logger.debug(`Traced mouse path with ${path.length} points`);
  }

  /**
   * Press or release mouse button
   */
  async pressMouse(params: PressMouseAction): Promise<void> {
    const { coordinates, button, press } = params;

    // Map button names
    const buttonMap: Record<string, string> = {
      left: 'left',
      right: 'right',
      middle: 'middle',
    };

    const pyButton = buttonMap[button] || 'left';

    let pythonCode = `
import pyautogui
pyautogui.FAILSAFE = False
`;

    // Move to coordinates if provided
    if (coordinates) {
      pythonCode += `pyautogui.moveTo(${coordinates.x}, ${coordinates.y}, duration=0)\n`;
    }

    // Press or release button
    if (press === 'down') {
      pythonCode += `pyautogui.mouseDown(button='${pyButton}')\n`;
    } else {
      pythonCode += `pyautogui.mouseUp(button='${pyButton}')\n`;
    }

    await this.omniboxClient.execute(pythonCode);

    this.logger.debug(`Mouse button ${button} ${press}`);
  }

  /**
   * Drag mouse along a path with button held
   */
  async dragMouse(params: DragMouseAction): Promise<void> {
    const { path, button, holdKeys } = params;

    if (!path || path.length === 0) {
      throw new Error('Path required');
    }

    // Map button names
    const buttonMap: Record<string, string> = {
      left: 'left',
      right: 'right',
      middle: 'middle',
    };

    const pyButton = buttonMap[button] || 'left';

    let pythonCode = `
import pyautogui
import time
pyautogui.FAILSAFE = False
`;

    // Move to first point
    pythonCode += `pyautogui.moveTo(${path[0].x}, ${path[0].y}, duration=0)\n`;

    // Hold keys if provided
    if (holdKeys && holdKeys.length > 0) {
      const mappedKeys = holdKeys.map((key) => this.mapKeyToPyAutoGUI(key));
      mappedKeys.forEach((key) => {
        pythonCode += `pyautogui.keyDown('${key}')\n`;
      });
    }

    // Hold mouse button down
    pythonCode += `pyautogui.mouseDown(button='${pyButton}')\n`;
    pythonCode += `time.sleep(0.1)\n`;

    // Drag along the path
    path.slice(1).forEach((coord) => {
      pythonCode += `pyautogui.moveTo(${coord.x}, ${coord.y}, duration=0.1)\n`;
    });

    // Release mouse button
    pythonCode += `pyautogui.mouseUp(button='${pyButton}')\n`;

    // Release hold keys
    if (holdKeys && holdKeys.length > 0) {
      const mappedKeys = holdKeys.map((key) => this.mapKeyToPyAutoGUI(key));
      mappedKeys.forEach((key) => {
        pythonCode += `pyautogui.keyUp('${key}')\n`;
      });
    }

    await this.omniboxClient.execute(pythonCode);

    this.logger.debug(
      `Dragged mouse along path with ${path.length} points using ${button} button`,
    );
  }

  /**
   * Type text
   */
  async typeText(params: TypeTextAction): Promise<void> {
    const { text } = params;

    if (!text) {
      throw new Error('Text required');
    }

    // Escape special characters for Python string
    const escapedText = text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');

    const pythonCode = `import pyautogui; pyautogui.FAILSAFE = False; pyautogui.write('${escapedText}')`;

    await this.omniboxClient.execute(pythonCode);

    this.logger.debug(`Typed text: ${text.substring(0, 50)}...`);
  }

  /**
   * Press keyboard keys
   */
  async pressKeys(params: PressKeysAction): Promise<void> {
    const { keys } = params;

    if (!keys || keys.length === 0) {
      throw new Error('Keys required');
    }

    // Map keys to PyAutoGUI format
    const mappedKeys = keys.map((key) => this.mapKeyToPyAutoGUI(key));

    if (mappedKeys.length === 1) {
      // Single key press
      const pythonCode = this.omniboxClient.buildPyAutoGUICommand('press', {
        keys: mappedKeys[0],
      });
      await this.omniboxClient.execute(pythonCode);
    } else {
      // Hotkey combination
      const keysList = mappedKeys.map((k) => `'${k}'`).join(', ');
      const pythonCode = `import pyautogui; pyautogui.FAILSAFE = False; pyautogui.hotkey(${keysList})`;
      await this.omniboxClient.execute(pythonCode);
    }

    this.logger.debug(`Pressed keys: ${keys.join('+')}`);
  }

  /**
   * Type keyboard keys (shortcuts like Enter, Ctrl+N, etc.)
   */
  async typeKeys(params: TypeKeysAction): Promise<void> {
    const { keys, delay } = params;

    if (!keys || keys.length === 0) {
      throw new Error('Keys required');
    }

    // Map keys to PyAutoGUI format
    const mappedKeys = keys.map((key) => this.mapKeyToPyAutoGUI(key));

    if (mappedKeys.length === 1) {
      // Single key press (e.g., Enter, Tab, Escape)
      const pythonCode = this.omniboxClient.buildPyAutoGUICommand('press', {
        keys: mappedKeys[0],
      });
      await this.omniboxClient.execute(pythonCode);
    } else {
      // Hotkey combination (e.g., Ctrl+N, Ctrl+S)
      const keysList = mappedKeys.map((k) => `'${k}'`).join(', ');
      const pythonCode = `import pyautogui; pyautogui.FAILSAFE = False; pyautogui.hotkey(${keysList})`;
      await this.omniboxClient.execute(pythonCode);
    }

    if (delay && delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.logger.debug(`Typed keys: ${keys.join(',')}`);
  }

  /**
   * Paste text using clipboard
   */
  async pasteText(params: PasteTextAction): Promise<void> {
    const { text } = params;

    if (!text) {
      throw new Error('Text required');
    }

    // Escape special characters for Python string
    const escapedText = text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

    // Use pyperclip to copy text to clipboard, then Ctrl+V to paste
    const pythonCode = `
import pyautogui
import pyperclip
pyautogui.FAILSAFE = False
# Copy text to clipboard
pyperclip.copy('${escapedText}')
# Paste using Ctrl+V
pyautogui.hotkey('ctrl', 'v')
`;

    await this.omniboxClient.execute(pythonCode);

    this.logger.debug(`Pasted text: ${text.substring(0, 50)}...`);
  }

  /**
   * Scroll
   */
  async scroll(params: ScrollAction): Promise<void> {
    const { direction, scrollCount = 3 } = params;

    const scrollAmount = direction === 'up' ? scrollCount : -scrollCount;

    const pythonCode = this.omniboxClient.buildPyAutoGUICommand('scroll', {
      clicks: scrollAmount,
    });

    await this.omniboxClient.execute(pythonCode);

    this.logger.debug(`Scrolled ${direction} by ${scrollCount}`);
  }

  /**
   * Launch application via Start menu
   */
  async launchApplication(params: ApplicationAction): Promise<void> {
    const { application } = params;

    if (!application) {
      throw new Error('Application name required');
    }

    // Windows: Open Start menu, type app name, press Enter
    const pythonCode = `
import pyautogui
import time
pyautogui.FAILSAFE = False
# Open Start menu
pyautogui.press('win')
time.sleep(0.5)
# Type app name
pyautogui.write('${application.replace(/'/g, "\\'")}')
time.sleep(0.5)
# Press Enter
pyautogui.press('enter')
`;

    await this.omniboxClient.execute(pythonCode);

    this.logger.debug(`Launched application: ${application}`);
  }

  /**
   * Wait / delay
   */
  async wait(duration: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, duration));
    this.logger.debug(`Waited ${duration}ms`);
  }

  /**
   * Get screen information
   */
  async getScreenInfo(): Promise<{
    width: number;
    height: number;
    displaySize: { width: number; height: number };
  }> {
    // Windows default resolution (OmniBox uses 1920x1080 by default)
    // TODO: Query actual resolution from OmniBox
    const width = 1920;
    const height = 1080;

    return {
      width,
      height,
      displaySize: { width, height },
    };
  }

  /**
   * Get cursor position
   */
  async getCursorPosition(): Promise<{ x: number; y: number }> {
    const position = await this.omniboxClient.getCursorPosition();
    this.logger.debug(`Cursor position: (${position.x}, ${position.y})`);
    return position;
  }

  /**
   * Read file from Windows filesystem
   */
  async readFile(
    params: ReadFileAction,
  ): Promise<{
    success: boolean;
    data?: string;
    name?: string;
    size?: number;
    mediaType?: string;
    message?: string;
  }> {
    try {
      const { path: filePath } = params;

      // Python code to read file and return base64
      const pythonCode = `
import os
import base64
import mimetypes
import json

file_path = r'${filePath.replace(/\\/g, '\\\\')}'

# Resolve relative paths to Desktop
if not os.path.isabs(file_path):
    desktop = os.path.join(os.path.expanduser('~'), 'Desktop')
    file_path = os.path.join(desktop, file_path)

# Read file
with open(file_path, 'rb') as f:
    data = f.read()

# Get file info
size = os.path.getsize(file_path)
name = os.path.basename(file_path)
media_type = mimetypes.guess_type(file_path)[0] or 'application/octet-stream'

# Encode to base64
data_base64 = base64.b64encode(data).decode('utf-8')

# Return JSON
result = {
    'success': True,
    'data': data_base64,
    'name': name,
    'size': size,
    'mediaType': media_type
}

print(json.dumps(result))
`;

      const output = await this.executeWithOutput(pythonCode);
      const result = JSON.parse(output.trim());

      this.logger.log(`File read successfully: ${filePath}`);
      return result;
    } catch (error) {
      this.logger.error(`Error reading file: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error reading file: ${error.message}`,
      };
    }
  }

  /**
   * Write file to Windows filesystem
   */
  async writeFile(
    params: WriteFileAction,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { path: filePath, data } = params;

      // Escape the file path and data for Python
      const escapedPath = filePath.replace(/\\/g, '\\\\');
      const escapedData = data.replace(/'/g, "\\'");

      // Python code to write file
      const pythonCode = `
import os
import base64

file_path = r'${escapedPath}'
data_base64 = '${escapedData}'

# Resolve relative paths to Desktop
if not os.path.isabs(file_path):
    desktop = os.path.join(os.path.expanduser('~'), 'Desktop')
    file_path = os.path.join(desktop, file_path)

# Ensure directory exists
directory = os.path.dirname(file_path)
if directory and not os.path.exists(directory):
    os.makedirs(directory)

# Decode and write file
data = base64.b64decode(data_base64)
with open(file_path, 'wb') as f:
    f.write(data)
`;

      await this.omniboxClient.execute(pythonCode);

      this.logger.log(`File written successfully: ${filePath}`);
      return {
        success: true,
        message: `File written successfully to: ${filePath}`,
      };
    } catch (error) {
      this.logger.error(`Error writing file: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error writing file: ${error.message}`,
      };
    }
  }

  /**
   * Capture custom region of screen
   */
  async screenshotCustomRegion(
    params: ScreenshotCustomRegionAction,
  ): Promise<{ image: string }> {
    const { x, y, width, height } = params;

    this.logger.debug(
      `Capturing region: x=${x}, y=${y}, width=${width}, height=${height}`,
    );

    // Python code to capture full screenshot and crop to region
    const pythonCode = `
import pyautogui
import base64
from io import BytesIO
from PIL import Image

# Capture full screenshot
screenshot = pyautogui.screenshot()

# Crop to region (left, top, right, bottom)
cropped = screenshot.crop((${x}, ${y}, ${x + width}, ${y + height}))

# Convert to base64
buffer = BytesIO()
cropped.save(buffer, format='PNG')
img_bytes = buffer.getvalue()
img_base64 = base64.b64encode(img_bytes).decode('utf-8')

# Print to stdout so we can capture it
print(img_base64)
`;

    // Execute and capture output
    const result = await this.executeWithOutput(pythonCode);

    // Extract base64 from output (last line should be the base64)
    const base64Image = result.trim();

    this.logger.debug(
      `Captured region (${base64Image.length} chars of base64)`,
    );

    return {
      image: base64Image,
    };
  }

  /**
   * Capture named region of screen
   * Maps region names like "top-left", "center" to coordinates
   */
  async screenshotRegion(params: {
    region: string;
    showCursor?: boolean;
  }): Promise<{ image: string }> {
    const { region } = params;

    this.logger.debug(`Capturing region: ${region}`);

    // Get screen dimensions
    const screenInfo = await this.getScreenInfo();
    const { width: screenWidth, height: screenHeight } = screenInfo;

    // Calculate region dimensions (half screen for quadrants, smaller for center)
    const halfWidth = Math.floor(screenWidth / 2);
    const halfHeight = Math.floor(screenHeight / 2);
    const centerWidth = Math.floor(screenWidth / 2);
    const centerHeight = Math.floor(screenHeight / 2);
    const centerX = Math.floor((screenWidth - centerWidth) / 2);
    const centerY = Math.floor((screenHeight - centerHeight) / 2);

    // Map region names to coordinates
    const regionMap: Record<
      string,
      { x: number; y: number; width: number; height: number }
    > = {
      'top-left': { x: 0, y: 0, width: halfWidth, height: halfHeight },
      'top-right': {
        x: halfWidth,
        y: 0,
        width: halfWidth,
        height: halfHeight,
      },
      'bottom-left': {
        x: 0,
        y: halfHeight,
        width: halfWidth,
        height: halfHeight,
      },
      'bottom-right': {
        x: halfWidth,
        y: halfHeight,
        width: halfWidth,
        height: halfHeight,
      },
      center: { x: centerX, y: centerY, width: centerWidth, height: centerHeight },
    };

    const coords = regionMap[region];
    if (!coords) {
      throw new Error(
        `Unknown region: ${region}. Valid regions: ${Object.keys(regionMap).join(', ')}`,
      );
    }

    this.logger.debug(
      `Region ${region} mapped to: x=${coords.x}, y=${coords.y}, width=${coords.width}, height=${coords.height}`,
    );

    // Delegate to custom region screenshot
    return this.screenshotCustomRegion({
      action: 'screenshot_custom_region',
      ...coords,
    });
  }

  /**
   * Execute Python code and return stdout
   */
  private async executeWithOutput(pythonCode: string): Promise<string> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = parseInt(process.env.OMNIBOX_TIMEOUT || '30000', 10);
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const baseUrl = process.env.OMNIBOX_URL || 'http://omnibox:5000';
      const response = await fetch(`${baseUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: ['python', '-c', pythonCode],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OmniBox execute failed: ${response.status} ${errorText}`,
        );
      }

      const result = await response.json();
      const elapsed = Date.now() - startTime;

      this.logger.debug(`Executed command in ${elapsed}ms`);

      // Check for errors
      if (result.status === 'error') {
        throw new Error(`Python execution error: ${result.message}`);
      }

      if (result.returncode !== 0) {
        throw new Error(
          `Python command failed with code ${result.returncode}: ${result.error}`,
        );
      }

      return result.output || '';
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger.error(
        `OmniBox execute error after ${elapsed}ms: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Map Bytebot key names to PyAutoGUI key names
   */
  private mapKeyToPyAutoGUI(key: string): string {
    const keyMap: Record<string, string> = {
      // Modifier keys
      ctrl: 'ctrl',
      alt: 'alt',
      shift: 'shift',
      win: 'win',
      super: 'win',
      meta: 'win',
      cmd: 'win',
      command: 'win',

      // Special keys
      enter: 'enter',
      return: 'enter',
      tab: 'tab',
      space: 'space',
      backspace: 'backspace',
      delete: 'delete',
      esc: 'esc',
      escape: 'esc',

      // Arrow keys
      up: 'up',
      down: 'down',
      left: 'left',
      right: 'right',

      // Function keys
      f1: 'f1',
      f2: 'f2',
      f3: 'f3',
      f4: 'f4',
      f5: 'f5',
      f6: 'f6',
      f7: 'f7',
      f8: 'f8',
      f9: 'f9',
      f10: 'f10',
      f11: 'f11',
      f12: 'f12',

      // Other keys
      home: 'home',
      end: 'end',
      pageup: 'pageup',
      pagedown: 'pagedown',
      insert: 'insert',
      printscreen: 'printscreen',

      // Numpad
      numlock: 'numlock',
      capslock: 'capslock',
      scrolllock: 'scrolllock',
    };

    const lowercaseKey = key.toLowerCase();
    return keyMap[lowercaseKey] || key;
  }
}
