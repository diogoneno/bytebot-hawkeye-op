import { Model } from "@/types";

/**
 * Provider categories for better organization
 */
export const PROVIDER_CATEGORIES = {
  ANTHROPIC: "Anthropic",
  OPENAI: "OpenAI",
  GOOGLE: "Google",
  OPENROUTER: "OpenRouter",
  LMSTUDIO: "LM Studio (Local)",
  OLLAMA: "Ollama (Local)",
  OTHER: "Other",
} as const;

/**
 * Provider display order
 */
const PROVIDER_ORDER = [
  PROVIDER_CATEGORIES.ANTHROPIC,
  PROVIDER_CATEGORIES.OPENAI,
  PROVIDER_CATEGORIES.GOOGLE,
  PROVIDER_CATEGORIES.OPENROUTER,
  PROVIDER_CATEGORIES.LMSTUDIO,
  PROVIDER_CATEGORIES.OLLAMA,
  PROVIDER_CATEGORIES.OTHER,
];

/**
 * Categorize a model into a provider category based on its name/provider
 */
export function categorizeModel(model: Model): string {
  const name = model.name.toLowerCase();
  const title = model.title.toLowerCase();

  // Check for Anthropic models
  if (
    name.includes("anthropic") ||
    name.includes("claude") ||
    title.includes("claude")
  ) {
    return PROVIDER_CATEGORIES.ANTHROPIC;
  }

  // Check for OpenAI models
  if (
    name.includes("openai/gpt") ||
    name.includes("openai/o3") ||
    title.includes("gpt-") ||
    title.includes("o3-")
  ) {
    return PROVIDER_CATEGORIES.OPENAI;
  }

  // Check for Google/Gemini models
  if (
    name.includes("gemini") ||
    name.includes("vertex_ai") ||
    title.includes("gemini")
  ) {
    return PROVIDER_CATEGORIES.GOOGLE;
  }

  // Check for LM Studio local models
  if (
    title.includes("local-lmstudio") ||
    (name.includes("openai/") &&
      (name.includes("qwen") || name.includes("gemma")))
  ) {
    return PROVIDER_CATEGORIES.LMSTUDIO;
  }

  // Check for Ollama local models
  if (
    title.includes("local-ollama") ||
    name.includes("ollama_chat/") ||
    name.includes("ollama/")
  ) {
    return PROVIDER_CATEGORIES.OLLAMA;
  }

  // Check for OpenRouter models
  if (name.includes("openrouter") || title.includes("openrouter")) {
    return PROVIDER_CATEGORIES.OPENROUTER;
  }

  return PROVIDER_CATEGORIES.OTHER;
}

/**
 * Group models by provider category
 */
export interface ModelGroup {
  category: string;
  models: Model[];
}

export function groupModelsByProvider(models: Model[]): ModelGroup[] {
  // Create a map of category -> models
  const groups = new Map<string, Model[]>();

  models.forEach((model) => {
    const category = categorizeModel(model);
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(model);
  });

  // Sort models within each group by title
  groups.forEach((models) => {
    models.sort((a, b) => a.title.localeCompare(b.title));
  });

  // Convert to array and sort by provider order
  const result: ModelGroup[] = [];
  PROVIDER_ORDER.forEach((category) => {
    if (groups.has(category)) {
      result.push({
        category,
        models: groups.get(category)!,
      });
    }
  });

  return result;
}

/**
 * Get a short display name for the provider category
 */
export function getProviderBadgeColor(category: string): string {
  switch (category) {
    case PROVIDER_CATEGORIES.ANTHROPIC:
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case PROVIDER_CATEGORIES.OPENAI:
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case PROVIDER_CATEGORIES.GOOGLE:
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case PROVIDER_CATEGORIES.OPENROUTER:
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case PROVIDER_CATEGORIES.LMSTUDIO:
      return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400";
    case PROVIDER_CATEGORIES.OLLAMA:
      return "bg-teal-500/10 text-teal-600 dark:text-teal-400";
    default:
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
  }
}
