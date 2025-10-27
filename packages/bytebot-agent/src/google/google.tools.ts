import { FunctionDeclaration, Type } from '@google/genai';
import { agentTools } from '../agent/agent.tools';

/**
 * Converts JSON Schema type to Google Genai Type
 */
function jsonSchemaTypeToGoogleType(type: string): Type {
  switch (type) {
    case 'string':
      return Type.STRING;
    case 'number':
      return Type.NUMBER;
    case 'integer':
      return Type.INTEGER;
    case 'boolean':
      return Type.BOOLEAN;
    case 'array':
      return Type.ARRAY;
    case 'object':
      return Type.OBJECT;
    default:
      return Type.STRING;
  }
}

/**
 * Converts JSON Schema to Google Genai parameter schema
 */
function convertJsonSchemaToGoogleSchema(schema: any): any {
  if (!schema) return {};

  const result: any = {
    type: jsonSchemaTypeToGoogleType(schema.type),
  };

  if (schema.description) {
    result.description = schema.description;
  }

  // Handle enum constraints
  if (schema.enum && Array.isArray(schema.enum)) {
    if (schema.type === 'string') {
      // String enums work natively with Google GenAI
      result.enum = schema.enum;
    } else if (schema.type === 'integer' || schema.type === 'number') {
      // Google GenAI only supports string enums, so convert numeric enums to strings
      // This preserves the constraint information (e.g., clickCount: [1,2,3] → ["1","2","3"])
      result.enum = schema.enum.map((v: any) => String(v));
      result.type = Type.STRING;
      console.debug(
        `[Google Tools] Converted ${schema.type} enum to string for Google API compatibility: [${schema.enum.join(', ')}] → ["${result.enum.join('", "')}"]`
      );
    }
  }

  if (schema.nullable) {
    result.nullable = true;
  }

  if (schema.type === 'array' && schema.items) {
    result.items = convertJsonSchemaToGoogleSchema(schema.items);
  }

  if (schema.type === 'object' && schema.properties) {
    result.properties = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      result.properties[key] = convertJsonSchemaToGoogleSchema(value);
    }
    if (schema.required) {
      result.required = schema.required;
    }
  }

  return result;
}

/**
 * Converts an agent tool definition to a Google FunctionDeclaration
 */
function agentToolToGoogleTool(agentTool: any): FunctionDeclaration {
  const parameters = convertJsonSchemaToGoogleSchema(agentTool.input_schema);

  return {
    name: agentTool.name,
    description: agentTool.description,
    parameters,
  };
}

/**
 * Creates a mapped object of tools by name
 */
const toolMap = agentTools.reduce(
  (acc, tool) => {
    const googleTool = agentToolToGoogleTool(tool);
    const camelCaseName = tool.name
      .split('_')
      .map((part, index) => {
        if (index === 0) return part;
        if (part === 'computer') return '';
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join('')
      .replace(/^computer/, '');

    acc[camelCaseName + 'Tool'] = googleTool;
    return acc;
  },
  {} as Record<string, FunctionDeclaration>,
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

// Array of all tools
export const googleTools: FunctionDeclaration[] = agentTools.map(
  agentToolToGoogleTool,
);
