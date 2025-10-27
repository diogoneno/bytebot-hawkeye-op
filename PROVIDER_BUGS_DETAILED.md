# AI Provider Integration - Detailed Bug Report

## Quick Reference: Bugs by Severity

### 🔴 CRITICAL (Fix Immediately)

1. **Google Service - Tool Call ID Fallback (google.service.ts:327)**
2. **Google Tools - Enum Type Restriction (google.tools.ts:40-43)**

### 🟠 HIGH (Fix This Week)

3. **Anthropic Service - Global Array Mutation (anthropic.service.ts:49-51)**

### 🟡 MEDIUM (Fix This Sprint)

4. **OpenAI Service - Silent Tool Argument Errors (openai.service.ts:678-684)**
5. **Google Service - Single Tool Result Block (google.service.ts:218-239)**
6. **Google Service - Fragile Error Detection (google.service.ts:100)**
7. **Anthropic Service - Empty Content Array Risk (anthropic.service.ts:188-191)**
8. **OpenAI Service - Responses API Images (openai.service.ts:342-345)**

### 🔵 LOW (Nice to Have)

9. **All Services - Empty Message Validation**
10. **Anthropic Service - Dummy Key Initialization**

---

## CRITICAL BUGS

### BUG #1: Google Tool Call ID Fallback [CRITICAL]

**Location:** `/home/zohair/repos/bytebot-hawkeye-op/packages/bytebot-agent/src/google/google.service.ts:327`

**Code:**
```typescript
private formatGoogleResponse(parts: Part[]): MessageContentBlock[] {
  return parts.map((part) => {
    // ...
    if (part.functionCall) {
      return {
        type: MessageContentType.ToolUse,
        id: part.functionCall.id || uuid(),  // LINE 327 - BUG HERE
        name: part.functionCall.name,
        input: part.functionCall.args,
      } as ToolUseContentBlock;
    }
    // ...
  });
}
```

**Problem:**
- If Google Gemini API returns function calls without IDs, code generates random UUIDs
- These random IDs don't match the original tool call request
- Tool results cannot be matched back to tool calls
- Breaks the entire tool use flow

**Risk Assessment:**
- **Severity:** CRITICAL
- **Likelihood:** HIGH (Google API may not always include IDs)
- **Impact:** Complete breakdown of tool calling - all tool results lost

**Reproduction:**
```
1. Call generateMessage with tools
2. Model calls a function
3. If Google returns function_call without id field
4. Random UUID generated instead
5. Tool result comes back, but ID doesn't match
6. Tool result gets lost
```

**Fix Options:**

**Option A: Strict Mode (Recommended)**
```typescript
if (part.functionCall) {
  if (!part.functionCall.id) {
    this.logger.error(
      `Google API returned function call without ID: ${part.functionCall.name}. ` +
      `Cannot match this call to tool results.`
    );
    // Either throw or generate deterministic ID
    throw new Error('Missing function call ID from Google API');
  }
  return {
    type: MessageContentType.ToolUse,
    id: part.functionCall.id,
    name: part.functionCall.name,
    input: part.functionCall.args,
  } as ToolUseContentBlock;
}
```

**Option B: Deterministic Fallback**
```typescript
if (part.functionCall) {
  const id = part.functionCall.id || `google_${Date.now()}_${part.functionCall.name}`;
  if (!part.functionCall.id) {
    this.logger.warn(
      `Generated deterministic ID for function call: ${id}`
    );
  }
  return {
    type: MessageContentType.ToolUse,
    id,
    name: part.functionCall.name,
    input: part.functionCall.args,
  } as ToolUseContentBlock;
}
```

**Priority:** DO TODAY - This breaks tool calling completely

---

### BUG #2: Google Enum Type Restriction [CRITICAL]

**Location:** `/home/zohair/repos/bytebot-hawkeye-op/packages/bytebot-agent/src/google/google.tools.ts:40-43`

**Code:**
```typescript
function convertJsonSchemaToGoogleSchema(schema: any): any {
  const result: any = {
    type: jsonSchemaTypeToGoogleType(schema.type),
  };

  // Only include enum if the property type is string; otherwise it is invalid for Google GenAI
  if (schema.type === 'string' && schema.enum && Array.isArray(schema.enum)) {
    result.enum = schema.enum;
  }
  // BUG: Integer/number enums silently dropped!
  
  return result;
}
```

**Problem:**
- Google Gemini API only supports enum on string types
- Integer/number enums are silently dropped from tool schemas
- Models receive no constraint information for numeric parameters
- Models can generate invalid values

**Affected Tools:**
All tools with integer enums. Examples from codebase:
- `computer_click_mouse.clickCount` (integer, default: 1)
- `computer_scroll.scrollCount` (integer)
- Any button enum using integers instead of strings

**Risk Assessment:**
- **Severity:** CRITICAL
- **Likelihood:** HIGH (many tools use integer enums)
- **Impact:** Models generate invalid parameter values (e.g., clickCount: 999)

**Example Failure:**
```javascript
// Tool definition (from agent.tools.ts)
clickCount: {
  type: 'integer',
  enum: [1, 2, 3],  // Only click 1, 2, or 3 times
  default: 1
}

// What gets sent to Google (BROKEN)
clickCount: {
  type: 'INTEGER',  // No enum constraint!
  default: 1
}

// What model generates (INVALID)
"clickCount": 10  // Out of bounds!
```

**Fix Options:**

**Option A: Convert to String Enums (Recommended)**
```typescript
function convertJsonSchemaToGoogleSchema(schema: any): any {
  const result: any = {
    type: jsonSchemaTypeToGoogleType(schema.type),
  };

  if (schema.enum && Array.isArray(schema.enum)) {
    // Convert all enum types to strings for Google compatibility
    if (schema.type === 'string') {
      result.enum = schema.enum;
    } else if (schema.type === 'integer' || schema.type === 'number') {
      // Convert numeric enums to string representation
      result.enum = schema.enum.map(v => String(v));
      result.type = Type.STRING;  // Force string type for enum
      this.logger.warn(
        `Converted numeric enum to string for Google: ${schema.enum}`
      );
    }
  }
  
  return result;
}
```

**Option B: Add Validation**
```typescript
function convertJsonSchemaToGoogleSchema(schema: any): any {
  const result: any = {
    type: jsonSchemaTypeToGoogleType(schema.type),
  };

  if (schema.enum && Array.isArray(schema.enum)) {
    if (schema.type === 'string') {
      result.enum = schema.enum;
    } else {
      this.logger.error(
        `Google GenAI does not support ${schema.type} enums. ` +
        `Parameter constraints will be lost: ${schema.enum}`
      );
    }
  }
  
  return result;
}
```

**Priority:** DO TODAY - Affects all tool calls with numeric constraints

---

## HIGH SEVERITY BUGS

### BUG #3: Anthropic Global Array Mutation [HIGH]

**Location:** `/home/zohair/repos/bytebot-hawkeye-op/packages/bytebot-agent/src/anthropic/anthropic.service.ts:49-51`

**Code:**
```typescript
async generateMessage(
  systemPrompt: string,
  messages: Message[],
  model: string = DEFAULT_MODEL.name,
  useTools: boolean = true,
  signal?: AbortSignal,
): Promise<BytebotAgentResponse> {
  try {
    const anthropicClient = this.getAnthropicClient();
    const maxTokens = 8192;

    const anthropicMessages = this.formatMessagesForAnthropic(messages);

    // add cache_control to last tool
    anthropicTools[anthropicTools.length - 1].cache_control = {
      type: 'ephemeral',
    };  // BUG: Mutates shared array!
```

**Problem:**
- Mutates the globally exported `anthropicTools` array
- Each call adds cache_control to the last tool
- Multiple concurrent requests can interfere with each other
- Tool definition becomes stateful (antipattern)

**Risk Assessment:**
- **Severity:** HIGH
- **Likelihood:** MEDIUM (only occurs with concurrent requests)
- **Impact:** Race conditions, tools get multiple cache_control additions

**Reproduction:**
```typescript
// Request 1 starts
anthropicTools[n].cache_control = { type: 'ephemeral' };

// Request 2 starts (before Request 1 finishes)
anthropicTools[n].cache_control = { type: 'ephemeral' };  // Overwrites!

// Request 1 may now have wrong state
// Or tools array has duplicate cache_control entries
```

**Fix:**
```typescript
async generateMessage(
  systemPrompt: string,
  messages: Message[],
  model: string = DEFAULT_MODEL.name,
  useTools: boolean = true,
  signal?: AbortSignal,
): Promise<BytebotAgentResponse> {
  try {
    const anthropicClient = this.getAnthropicClient();
    const maxTokens = 8192;

    const anthropicMessages = this.formatMessagesForAnthropic(messages);

    // Clone tools array and add cache_control locally (don't mutate global)
    const toolsWithCache = useTools ? anthropicTools.map((tool, idx) => {
      if (idx === anthropicTools.length - 1) {
        return {
          ...tool,
          cache_control: { type: 'ephemeral' },
        };
      }
      return tool;
    }) : [];

    const response = await anthropicClient.messages.create(
      {
        model,
        max_tokens: maxTokens * 2,
        thinking: { type: 'disabled' },
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: anthropicMessages,
        tools: toolsWithCache,  // Use cloned array
      },
      { signal },
    );
    // ...
  }
}
```

**Priority:** THIS WEEK - Could cause race conditions in production

---

## MEDIUM SEVERITY BUGS

### BUG #4: OpenAI Silent Tool Argument Errors [MEDIUM]

**Location:** `/home/zohair/repos/bytebot-hawkeye-op/packages/bytebot-agent/src/openai/openai.service.ts:678-684`

**Code:**
```typescript
private formatChatCompletionResponse(
  message: OpenAI.Chat.ChatCompletionMessage,
): MessageContentBlock[] {
  const contentBlocks: MessageContentBlock[] = [];

  // ...
  
  if (message.tool_calls && message.tool_calls.length > 0) {
    for (const toolCall of message.tool_calls) {
      if (toolCall.type === 'function') {
        let parsedInput = {};
        try {
          parsedInput = JSON.parse(toolCall.function.arguments || '{}');
        } catch (e) {
          this.logger.warn(
            `Failed to parse tool call arguments: ${toolCall.function.arguments}`,
          );
          parsedInput = {};  // BUG: Silent fallback to empty object!
        }

        contentBlocks.push({
          type: MessageContentType.ToolUse,
          id: toolCall.id,
          name: toolCall.function.name,
          input: parsedInput,  // Could be wrong!
        } as ToolUseContentBlock);
      }
    }
  }
}
```

**Problem:**
- JSON parsing failures silently converted to empty objects
- Tool is called with no parameters (wrong behavior)
- No indication to caller that parsing failed
- Difficult to debug

**Example Failure:**
```javascript
// API returns malformed JSON
toolCall.function.arguments = '{"x": 100, "y": 200,}'  // Trailing comma (invalid)

// Try to parse
JSON.parse('{"x": 100, "y": 200,}')  // Throws SyntaxError

// Catch silently
parsedInput = {}  // Wrong! Lost all parameters

// Tool called with empty input
click_mouse({ })  // No coordinates!
```

**Fix:**
```typescript
for (const toolCall of message.tool_calls) {
  if (toolCall.type === 'function') {
    let parsedInput = {};
    try {
      parsedInput = JSON.parse(toolCall.function.arguments || '{}');
    } catch (e) {
      this.logger.error(
        `Failed to parse tool call arguments for ${toolCall.function.name}: ` +
        `${toolCall.function.arguments}. ` +
        `Error: ${e.message}`
      );
      
      // Option 1: Throw and fail loudly
      throw new Error(
        `Tool call ${toolCall.function.name} has malformed arguments: ` +
        `${toolCall.function.arguments}`
      );
      
      // Option 2: Return error block
      contentBlocks.push({
        type: MessageContentType.ToolUse,
        id: toolCall.id,
        name: toolCall.function.name,
        input: { __error: e.message, __raw: toolCall.function.arguments },
      } as ToolUseContentBlock);
      continue;
    }

    contentBlocks.push({
      type: MessageContentType.ToolUse,
      id: toolCall.id,
      name: toolCall.function.name,
      input: parsedInput,
    } as ToolUseContentBlock);
  }
}
```

**Priority:** THIS SPRINT - Could cause silent failures

---

### BUG #5: Google Single Tool Result Block [MEDIUM]

**Location:** `/home/zohair/repos/bytebot-hawkeye-op/packages/bytebot-agent/src/google/google.service.ts:218-239`

**Code:**
```typescript
case MessageContentType.ToolResult: {
  const toolResultContentBlock = block.content[0];  // BUG: Only checks first block!
  if (toolResultContentBlock.type === MessageContentType.Image) {
    parts.push({
      functionResponse: {
        id: block.tool_use_id,
        name: 'screenshot',
        response: {
          ...(!block.is_error && {
            output: 'screenshot successful',
          }),
          ...(block.is_error && { error: block.content[0] }),
        },
      },
    });
    parts.push({
      inlineData: {
        data: toolResultContentBlock.source.data,
        mimeType: toolResultContentBlock.source.media_type,
      },
    });
    break;  // Returns early!
  }

  // This code only runs if first block isn't an image
  parts.push({
    functionResponse: {
      id: block.tool_use_id,
      name: this.getToolName(block.tool_use_id, messages),
      response: {
        ...(!block.is_error && { output: block.content[0] }),
        ...(block.is_error && { error: block.content[0] }),
      },
    },
  });
  break;
}
```

**Problem:**
- ToolResultContentBlock can have multiple items in `.content`
- Code only processes `block.content[0]` (first item)
- If tool result has multiple screenshots, only first is sent
- Remaining screenshots are silently dropped

**Risk Assessment:**
- **Severity:** MEDIUM
- **Likelihood:** MEDIUM (edge case, but possible)
- **Impact:** Incomplete tool results sent to model

**Example Failure:**
```typescript
// Tool result with multiple images
toolResult: {
  tool_use_id: 'call_123',
  content: [
    { type: 'text', text: 'Screenshot 1 of 2' },
    { type: 'image', source: { data: '...png1...' } },
    { type: 'text', text: 'Screenshot 2 of 2' },
    { type: 'image', source: { data: '...png2...' } },
  ],
  is_error: false,
}

// Current code behavior
const toolResultContentBlock = block.content[0];  // Gets text "Screenshot 1 of 2"
if (toolResultContentBlock.type === MessageContentType.Image) {  // FALSE
  // Skipped!
}
// Second image never added
```

**Fix:**
```typescript
case MessageContentType.ToolResult: {
  const hasImages = block.content.some(c => c.type === MessageContentType.Image);
  const texts = block.content.filter(c => c.type === MessageContentType.Text);
  const images = block.content.filter(c => c.type === MessageContentType.Image);

  // Add function response with text summary
  if (texts.length > 0) {
    parts.push({
      functionResponse: {
        id: block.tool_use_id,
        name: this.getToolName(block.tool_use_id, messages),
        response: {
          ...(!block.is_error && { output: texts[0].text }),
          ...(block.is_error && { error: texts[0].text }),
        },
      },
    });
  } else if (!block.is_error) {
    parts.push({
      functionResponse: {
        id: block.tool_use_id,
        name: this.getToolName(block.tool_use_id, messages),
        response: { output: 'success' },
      },
    });
  }

  // Add ALL images
  for (const image of images) {
    parts.push({
      inlineData: {
        data: image.source.data,
        mimeType: image.source.media_type,
      },
    });
  }
  break;
}
```

**Priority:** THIS SPRINT - Affects multi-image tool results

---

### BUG #6: Google Fragile Error Detection [MEDIUM]

**Location:** `/home/zohair/repos/bytebot-hawkeye-op/packages/bytebot-agent/src/google/google.service.ts:100`

**Code:**
```typescript
async generateMessage(
  systemPrompt: string,
  messages: Message[],
  model: string = DEFAULT_MODEL.name,
  useTools: boolean = true,
  signal?: AbortSignal,
): Promise<BytebotAgentResponse> {
  try {
    // ...
  } catch (error) {
    if (error.message.includes('AbortError')) {  // BUG: String matching!
      throw new BytebotAgentInterrupt();
    }
    this.logger.error(
      `Error sending message to Google Gemini: ${error.message}`,
      error.stack,
    );
    throw error;
  }
}
```

**Problem:**
- Relies on error.message containing 'AbortError'
- Fragile - depends on exact error message format
- Different error types might have different messages
- Could fail to catch AbortError if message changes

**Risk Assessment:**
- **Severity:** MEDIUM
- **Likelihood:** MEDIUM (depends on API error format)
- **Impact:** AbortError not caught, causes wrong exception type

**Fix:**
```typescript
catch (error: any) {
  // Check by error type first
  if (error instanceof Error && error.name === 'AbortError') {
    throw new BytebotAgentInterrupt();
  }
  
  // Fallback to message check if needed
  if (error?.message?.includes?.('AbortError') || error?.message?.includes?.('abort')) {
    this.logger.debug('Google API call aborted');
    throw new BytebotAgentInterrupt();
  }
  
  this.logger.error(
    `Error sending message to Google Gemini: ${error?.message}`,
    error?.stack,
  );
  throw error;
}
```

**Priority:** THIS SPRINT - Better error handling

---

### BUG #7: Anthropic Empty Content Array [MEDIUM]

**Location:** `/home/zohair/repos/bytebot-hawkeye-op/packages/bytebot-agent/src/anthropic/anthropic.service.ts:188-191`

**Code:**
```typescript
private formatMessagesForAnthropic(
  messages: Message[],
): Anthropic.MessageParam[] {
  const anthropicMessages: Anthropic.MessageParam[] = [];

  for (const [index, message] of messages.entries()) {
    const messageContentBlocks = message.content as MessageContentBlock[];
    const content: Anthropic.ContentBlockParam[] = [];

    // ... build content array ...

    if (index === messages.length - 1) {
      content[content.length - 1]['cache_control'] = {  // BUG: Assumes non-empty!
        type: 'ephemeral',
      };
    }
    
    anthropicMessages.push({
      role: message.role === Role.USER ? 'user' : 'assistant',
      content: content,
    });
  }

  return anthropicMessages;
}
```

**Problem:**
- Accesses `content[content.length - 1]` without checking if array is empty
- If content is empty (no blocks), this is `content[-1]` (undefined)
- Could fail silently or cause unexpected behavior
- Edge case but possible

**Risk Assessment:**
- **Severity:** MEDIUM
- **Likelihood:** LOW (requires message with no content blocks)
- **Impact:** Cache control not applied, or error on empty array

**Fix:**
```typescript
if (index === messages.length - 1) {
  if (content.length > 0) {
    content[content.length - 1]['cache_control'] = {
      type: 'ephemeral',
    };
  } else {
    this.logger.warn('Last message has empty content array, skipping cache control');
  }
}
```

**Priority:** THIS SPRINT - Better edge case handling

---

### BUG #8: OpenAI Responses API Images [MEDIUM]

**Location:** `/home/zohair/repos/bytebot-hawkeye-op/packages/bytebot-agent/src/openai/openai.service.ts:342-345`

**Code:**
```typescript
private formatMessagesForOpenAI(
  messages: Message[],
): OpenAI.Responses.ResponseInputItem[] {
  const openaiMessages: OpenAI.Responses.ResponseInputItem[] = [];

  for (const message of messages) {
    // ...
    case MessageContentType.ToolResult: {
      const toolResult = block;
      for (const content of toolResult.content) {
        if (content.type === MessageContentType.Text) {
          openaiMessages.push({
            type: 'function_call_output',
            call_id: toolResult.tool_use_id,
            output: content.text,
          } as OpenAI.Responses.ResponseInputItem.FunctionCallOutput);
        }
        if (content.type === MessageContentType.Image) {
          openaiMessages.push({
            type: 'function_call_output',
            call_id: toolResult.tool_use_id,
            output: 'screenshot',  // BUG: Generic text, not actual image!
          } as OpenAI.Responses.ResponseInputItem.FunctionCallOutput);
        }
      }
      break;
    }
```

**Problem:**
- Converts screenshot to generic text "screenshot"
- Actual image data is lost
- Models don't see the actual screenshot
- Issue is specific to Responses API (o1/o3 models)

**Risk Assessment:**
- **Severity:** MEDIUM
- **Likelihood:** MEDIUM (only affects Responses API / o-series)
- **Impact:** o1/o3 models can't see actual screenshots

**Mitigation Note:**
This may actually be correct - Responses API might not support images in tool results.
**Action:** Verify with OpenAI Responses API documentation before fixing.

**Potential Fix:**
```typescript
if (content.type === MessageContentType.Image) {
  // Check if Responses API supports images in tool outputs
  // If not, this is correct behavior (image as text "screenshot")
  // If yes, add image data:
  openaiMessages.push({
    type: 'function_call_output',
    call_id: toolResult.tool_use_id,
    output: `screenshot: data:image/png;base64,${content.source.data}`,
  } as OpenAI.Responses.ResponseInputItem.FunctionCallOutput);
}
```

**Priority:** VERIFY THEN FIX - Need API documentation clarification

---

## LOW SEVERITY ISSUES

### BUG #9: Empty Message Validation [LOW]

**Location:** All services (anthropic.service.ts, openai.service.ts, google.service.ts, proxy.service.ts)

**Problem:**
- No validation that messages array is non-empty
- No check that message.content has blocks
- Could cause confusing API errors

**Risk:** LOW (runtime error would surface)

**Fix:** Add validation at start of formatMessages methods:
```typescript
private formatMessagesForAnthropic(messages: Message[]): Anthropic.MessageParam[] {
  if (!messages || messages.length === 0) {
    throw new Error('Cannot generate message: messages array is empty');
  }
  
  for (const message of messages) {
    const content = message.content as MessageContentBlock[];
    if (!content || content.length === 0) {
      this.logger.warn('Message has empty content array');
    }
  }
  // ...
}
```

---

### BUG #10: Anthropic Dummy Key Init [LOW]

**Location:** `/home/zohair/repos/bytebot-hawkeye-op/packages/bytebot-agent/src/anthropic/anthropic.service.ts:102-104`

**Problem:**
- Initializes SDK with 'dummy-key-for-initialization'
- Errors only surface at API call time
- Harder to catch configuration errors early

**Risk:** LOW (error is caught and logged)

**Fix:** Check key before creating SDK:
```typescript
private initializeClient() {
  const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

  if (!apiKey) {
    this.logMissingKey();
    this.anthropic = null;  // Don't create SDK
    return;
  }

  this.anthropic = new Anthropic({ apiKey });
  this.currentApiKey = apiKey;
  this.hasLoggedMissingKey = false;
}

async generateMessage(...): Promise<BytebotAgentResponse> {
  if (!this.anthropic) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  // ...
}
```

---

## Testing Checklist

- [ ] Test Google UUID generation with missing IDs
- [ ] Test Google enum handling with integer parameters
- [ ] Test Anthropic with concurrent requests
- [ ] Test OpenAI with malformed tool arguments
- [ ] Test Google with multiple tool result blocks
- [ ] Test Google abort error handling
- [ ] Test Anthropic with empty message content
- [ ] Test all services with empty messages array
- [ ] Test Responses API image handling

---

## Summary

| ID | Bug | Severity | Status |
|----|-----|----------|--------|
| 1 | Google UUID fallback | CRITICAL | Not Fixed |
| 2 | Google enum restriction | CRITICAL | Not Fixed |
| 3 | Anthropic global mutation | HIGH | Not Fixed |
| 4 | OpenAI silent errors | MEDIUM | Not Fixed |
| 5 | Google single result block | MEDIUM | Not Fixed |
| 6 | Google error detection | MEDIUM | Not Fixed |
| 7 | Anthropic empty array | MEDIUM | Not Fixed |
| 8 | OpenAI Responses images | MEDIUM | Needs verification |
| 9 | Empty message validation | LOW | Not Fixed |
| 10 | Dummy key init | LOW | Not Fixed |

---

**Report Generated:** October 26, 2025
