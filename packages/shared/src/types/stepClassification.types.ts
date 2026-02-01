import type { ComputerAction } from './computerAction.types';

export type StepDecision = 'block' | 'warn' | 'allow';

export type ActionIntent =
  | 'navigate'
  | 'read'
  | 'write'
  | 'delete'
  | 'install'
  | 'configure'
  | 'execute'
  | 'shutdown'
  | 'payment'
  | 'export'
  | 'import'
  | 'unknown';

export type ActionTarget = {
  label?: string;
  role?: string;
  type?: string;
  selector?: string;
  app?: string;
};

export type ActionMetadata = {
  action: ComputerAction['action'];
  description?: string;
  inputText?: string;
  intent?: ActionIntent;
  confidence?: number;
  requiresAdmin?: boolean;
  isDestructive?: boolean;
  target?: ActionTarget;
};

export type TelemetryContext = {
  activeApp?: string;
  activeWindowTitle?: string;
  instructionClarity?: number;
  userConfirmed?: boolean;
  privilegeLevel?: 'user' | 'admin' | 'system';
  recentErrors?: string[];
};

export type RuleConditionGroup = {
  allOf?: RuleCondition[];
  anyOf?: RuleCondition[];
  noneOf?: RuleCondition[];
};

export type RuleCondition =
  | { type: 'group'; group: RuleConditionGroup }
  | { type: 'actionIn'; actions: ComputerAction['action'][] }
  | { type: 'intentIn'; intents: ActionIntent[] }
  | { type: 'metadataFlag'; flag: keyof ActionMetadata; value: boolean }
  | {
      type: 'textMatches';
      field: 'description' | 'inputText' | 'targetLabel';
      patterns: string[];
    }
  | {
      type: 'confidenceBelow';
      field: 'confidence' | 'instructionClarity';
      value: number;
    }
  | { type: 'telemetryFlag'; flag: keyof TelemetryContext; value: boolean }
  | { type: 'telemetryAppMatches'; patterns: string[] }
  | { type: 'targetRoleIn'; roles: string[] }
  | { type: 'privilegeNotIn'; levels: TelemetryContext['privilegeLevel'][] };

export type StepRuleDefinition = {
  id: string;
  decision: StepDecision;
  description: string;
  condition: RuleConditionGroup;
};

export type RuleMatch = {
  ruleId: string;
  decision: StepDecision;
  description: string;
};

export type StepClassificationResult = {
  decision: StepDecision;
  matches: RuleMatch[];
};

export type StepScenario = {
  id: string;
  metadata: ActionMetadata;
  telemetry: TelemetryContext;
  expectedDecision: StepDecision;
};
