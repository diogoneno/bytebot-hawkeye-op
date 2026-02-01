import type { StepRuleDefinition } from '../types/stepClassification.types';

export const defaultStepRules: StepRuleDefinition[] = [
  {
    id: 'block-destructive-without-confirmation',
    decision: 'block',
    description:
      'Block destructive operations unless the user explicitly confirmed the step.',
    condition: {
      allOf: [
        {
          type: 'group',
          group: {
            anyOf: [
              { type: 'metadataFlag', flag: 'isDestructive', value: true },
              {
                type: 'intentIn',
                intents: ['delete', 'shutdown', 'execute', 'import', 'export'],
              },
              {
                type: 'textMatches',
                field: 'inputText',
                patterns: ['rm -rf', 'format', 'wipe', 'drop database', 'delete'],
              },
              {
                type: 'textMatches',
                field: 'description',
                patterns: ['factory reset', 'erase', 'uninstall', 'delete'],
              },
            ],
          },
        },
      ],
      noneOf: [{ type: 'telemetryFlag', flag: 'userConfirmed', value: true }],
    },
  },
  {
    id: 'block-privilege-boundary',
    decision: 'block',
    description:
      'Block steps that require elevated privileges when running in a non-privileged session.',
    condition: {
      allOf: [
        { type: 'metadataFlag', flag: 'requiresAdmin', value: true },
        { type: 'privilegeNotIn', levels: ['admin', 'system'] },
      ],
    },
  },
  {
    id: 'block-low-confidence',
    decision: 'block',
    description:
      'Block steps when model confidence or instruction clarity is critically low.',
    condition: {
      anyOf: [
        { type: 'confidenceBelow', field: 'confidence', value: 0.3 },
        { type: 'confidenceBelow', field: 'instructionClarity', value: 0.3 },
      ],
    },
  },
  {
    id: 'warn-ambiguous-instructions',
    decision: 'warn',
    description:
      'Warn when instructions are ambiguous or model confidence is degraded.',
    condition: {
      anyOf: [
        { type: 'confidenceBelow', field: 'confidence', value: 0.6 },
        { type: 'confidenceBelow', field: 'instructionClarity', value: 0.6 },
      ],
    },
  },
  {
    id: 'warn-risky-ui-targets',
    decision: 'warn',
    description:
      'Warn when targeting UI elements that look destructive or sensitive.',
    condition: {
      anyOf: [
        {
          type: 'textMatches',
          field: 'targetLabel',
          patterns: [
            'delete',
            'remove',
            'disable',
            'terminate',
            'revoke',
            'reset',
            'format',
            'erase',
          ],
        },
        { type: 'targetRoleIn', roles: ['destructive', 'danger'] },
      ],
    },
  },
];
