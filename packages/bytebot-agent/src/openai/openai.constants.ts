import { BytebotAgentModel } from 'src/agent/agent.types';

export type OpenAIApiType = 'responses' | 'chat';

export interface OpenAIModel extends BytebotAgentModel {
  apiType: OpenAIApiType;
}

export const OPENAI_MODELS: OpenAIModel[] = [
  // Standard Chat Completions models (gpt-4o, gpt-4-turbo)
  {
    provider: 'openai',
    name: 'gpt-4o',
    title: 'GPT-4o',
    contextWindow: 128000,
    supportsVision: true,
    apiType: 'chat',
  },
  {
    provider: 'openai',
    name: 'gpt-4o-mini',
    title: 'GPT-4o Mini',
    contextWindow: 128000,
    supportsVision: true,
    apiType: 'chat',
  },
  {
    provider: 'openai',
    name: 'gpt-4-turbo',
    title: 'GPT-4 Turbo',
    contextWindow: 128000,
    supportsVision: true,
    apiType: 'chat',
  },
  {
    provider: 'openai',
    name: 'gpt-4-turbo-2024-04-09',
    title: 'GPT-4 Turbo (April 2024)',
    contextWindow: 128000,
    supportsVision: true,
    apiType: 'chat',
  },
  // Responses API models (o-series, gpt-4.1+)
  {
    provider: 'openai',
    name: 'o3-2025-04-16',
    title: 'o3',
    contextWindow: 200000,
    supportsVision: false,
    supportsReasoning: true,
    apiType: 'responses',
  },
  {
    provider: 'openai',
    name: 'gpt-4.1-2025-04-14',
    title: 'GPT-4.1',
    contextWindow: 1047576,
    supportsVision: true,
    apiType: 'responses',
  },
];

export const DEFAULT_MODEL = OPENAI_MODELS[0];

/**
 * Detect which API type to use based on model name
 * - o-series (o1, o3) and gpt-4.1+ use Responses API
 * - All other models use Chat Completions API
 */
export function detectApiType(modelName: string): OpenAIApiType {
  // Check if model starts with 'o' followed by a digit (o1, o3, etc.)
  if (/^o\d/.test(modelName)) {
    return 'responses';
  }
  // Check for gpt-4.1 or higher (gpt-4.1, gpt-5, etc.)
  if (/^gpt-([5-9]|4\.[1-9])/.test(modelName)) {
    return 'responses';
  }
  // Default to Chat Completions API
  return 'chat';
}
