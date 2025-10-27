import OpenAI from 'openai';
import { ChatCompletionTool } from 'openai/resources/chat/completions';
import { agentTools } from '../agent/agent.tools';

/**
 * Convert agent tool to Responses API format
 * Used for: o-series (o1, o3), gpt-4.1+
 */
function agentToolToOpenAITool(agentTool: any): OpenAI.Responses.FunctionTool {
  return {
    type: 'function',
    name: agentTool.name,
    description: agentTool.description,
    parameters: agentTool.input_schema,
  } as OpenAI.Responses.FunctionTool;
}

/**
 * Convert agent tool to Chat Completion format
 * Used for: gpt-4o, gpt-4-turbo, gpt-3.5-turbo, etc.
 */
function agentToolToChatCompletionTool(agentTool: any): ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name: agentTool.name,
      description: agentTool.description,
      parameters: agentTool.input_schema,
    },
  };
}

/**
 * Creates a mapped object of tools by name
 */
const toolMap = agentTools.reduce(
  (acc, tool) => {
    const anthropicTool = agentToolToOpenAITool(tool);
    const camelCaseName = tool.name
      .split('_')
      .map((part, index) => {
        if (index === 0) return part;
        if (part === 'computer') return '';
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join('')
      .replace(/^computer/, '');

    acc[camelCaseName + 'Tool'] = anthropicTool;
    return acc;
  },
  {} as Record<string, OpenAI.Responses.FunctionTool>,
);

// Export individual tools with proper names
export const moveMouseTool = toolMap.moveMouseTool;
export const traceMouseTool = toolMap.traceMouseTool;
export const clickMouseTool = toolMap.clickMouseTool;
export const pressMouseTool = toolMap.pressMouseTool;
export const dragMouseTool = toolMap.dragMouseTool;
export const scrollTool = toolMap.scrollTool;
export const typeKeysTool = toolMap.typeKeysTool;
export const pressKeysTool = toolMap.pressKeysTool;
export const typeTextTool = toolMap.typeTextTool;
export const pasteTextTool = toolMap.pasteTextTool;
export const waitTool = toolMap.waitTool;
export const screenshotTool = toolMap.screenshotTool;
export const cursorPositionTool = toolMap.cursorPositionTool;
export const screenInfoTool = toolMap.screenInfoTool;
export const setTaskStatusTool = toolMap.setTaskStatusTool;
export const createTaskTool = toolMap.createTaskTool;
export const applicationTool = toolMap.applicationTool;

// Array of all tools for Responses API (o-series, gpt-4.1+)
export const openaiTools: OpenAI.Responses.FunctionTool[] = agentTools.map(
  agentToolToOpenAITool,
);

// Array of all tools for Chat Completions API (gpt-4o, gpt-4-turbo, etc.)
export const openaiChatTools: ChatCompletionTool[] = agentTools.map(
  agentToolToChatCompletionTool,
);
