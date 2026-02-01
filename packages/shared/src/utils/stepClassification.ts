import { defaultStepRules } from '../config/stepClassificationRules';
import type {
  ActionMetadata,
  RuleCondition,
  RuleConditionGroup,
  StepClassificationResult,
  StepDecision,
  StepRuleDefinition,
  TelemetryContext,
} from '../types/stepClassification.types';

const decisionRank: Record<StepDecision, number> = {
  block: 3,
  warn: 2,
  allow: 1,
};

const evaluateCondition = (
  condition: RuleCondition,
  metadata: ActionMetadata,
  telemetry: TelemetryContext,
): boolean => {
  switch (condition.type) {
    case 'group':
      return evaluateGroup(condition.group, metadata, telemetry);
    case 'actionIn':
      return condition.actions.includes(metadata.action);
    case 'intentIn':
      return condition.intents.includes(metadata.intent ?? 'unknown');
    case 'metadataFlag':
      return Boolean(metadata[condition.flag]) === condition.value;
    case 'textMatches': {
      const value =
        condition.field === 'targetLabel'
          ? metadata.target?.label
          : metadata[condition.field];
      if (!value) return false;
      return condition.patterns.some((pattern) =>
        new RegExp(pattern, 'i').test(value),
      );
    }
    case 'confidenceBelow': {
      const value =
        condition.field === 'confidence'
          ? metadata.confidence
          : telemetry.instructionClarity;
      if (value === undefined) return false;
      return value < condition.value;
    }
    case 'telemetryFlag':
      return Boolean(telemetry[condition.flag]) === condition.value;
    case 'telemetryAppMatches':
      return condition.patterns.some((pattern) =>
        new RegExp(pattern, 'i').test(telemetry.activeApp ?? ''),
      );
    case 'targetRoleIn':
      return condition.roles.includes(metadata.target?.role ?? '');
    case 'privilegeNotIn':
      return !condition.levels.includes(telemetry.privilegeLevel);
    default:
      return false;
  }
};

const evaluateGroup = (
  group: RuleConditionGroup,
  metadata: ActionMetadata,
  telemetry: TelemetryContext,
): boolean => {
  if (group.allOf) {
    const allOk = group.allOf.every((condition) =>
      evaluateCondition(condition, metadata, telemetry),
    );
    if (!allOk) return false;
  }

  if (group.anyOf) {
    const anyOk = group.anyOf.some((condition) =>
      evaluateCondition(condition, metadata, telemetry),
    );
    if (!anyOk) return false;
  }

  if (group.noneOf) {
    const noneOk = group.noneOf.every(
      (condition) => !evaluateCondition(condition, metadata, telemetry),
    );
    if (!noneOk) return false;
  }

  return true;
};

export const classifyStep = (
  metadata: ActionMetadata,
  telemetry: TelemetryContext,
  rules: StepRuleDefinition[] = defaultStepRules,
): StepClassificationResult => {
  const matches = rules
    .filter((rule) => evaluateGroup(rule.condition, metadata, telemetry))
    .map((rule) => ({
      ruleId: rule.id,
      decision: rule.decision,
      description: rule.description,
    }));

  const decision = matches.reduce<StepDecision>((current, match) => {
    return decisionRank[match.decision] > decisionRank[current]
      ? match.decision
      : current;
  }, 'allow');

  return { decision, matches };
};
