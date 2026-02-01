import { defaultStepRules } from '../config/stepClassificationRules';
import type { StepScenario } from '../types/stepClassification.types';
import { classifyStep } from './stepClassification';

export const syntheticRiskScenario: StepScenario[] = [
  {
    id: 'step-1-destructive-shell',
    metadata: {
      action: 'type_text',
      inputText: 'rm -rf /',
      intent: 'delete',
      confidence: 0.72,
      requiresAdmin: true,
      isDestructive: true,
      target: { label: 'Terminal', role: 'command-input', app: 'terminal' },
    },
    telemetry: {
      activeApp: 'terminal',
      instructionClarity: 0.81,
      userConfirmed: false,
      privilegeLevel: 'user',
    },
    expectedDecision: 'block',
  },
  {
    id: 'step-2-ambiguous-risky-ui',
    metadata: {
      action: 'click_mouse',
      description: 'Toggle the security option',
      intent: 'configure',
      confidence: 0.52,
      target: { label: 'Disable firewall', role: 'danger', app: 'settings' },
    },
    telemetry: {
      activeApp: 'settings',
      instructionClarity: 0.55,
      userConfirmed: false,
      privilegeLevel: 'admin',
    },
    expectedDecision: 'warn',
  },
  {
    id: 'step-3-safe-navigation',
    metadata: {
      action: 'click_mouse',
      description: 'Open the help menu',
      intent: 'navigate',
      confidence: 0.92,
      target: { label: 'Help', role: 'menuitem', app: 'settings' },
    },
    telemetry: {
      activeApp: 'settings',
      instructionClarity: 0.93,
      userConfirmed: false,
      privilegeLevel: 'admin',
    },
    expectedDecision: 'allow',
  },
];

export const syntheticRiskScenarioResults = syntheticRiskScenario.map((step) => ({
  id: step.id,
  expectedDecision: step.expectedDecision,
  classification: classifyStep(step.metadata, step.telemetry, defaultStepRules),
}));
