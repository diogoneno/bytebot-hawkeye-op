import {
  FailureTaxonomyDefinition,
  FailureTaxonomyLabel,
} from './types/trajectory.types';

const FAILURE_TAXONOMY: FailureTaxonomyDefinition[] = [
  {
    label: 'grounding_error',
    description:
      'The model could not correctly ground its actions in the UI, such as missing elements or misreading coordinates.',
  },
  {
    label: 'ui_drift',
    description:
      'The UI shifted or the coordinate system drifted, causing actions to land on the wrong targets.',
  },
  {
    label: 'instruction_ambiguity',
    description:
      'The task instructions were underspecified, conflicting, or missing critical details needed to proceed.',
  },
  {
    label: 'privilege_boundary',
    description:
      'The task failed due to access controls, permissions, or missing credentials.',
  },
  {
    label: 'evaluator_mismatch',
    description:
      'The evaluator or success criteria did not align with what the agent produced.',
  },
];

const LABEL_PATTERNS: Record<FailureTaxonomyLabel, RegExp[]> = {
  grounding_error: [
    /element not found/i,
    /no (ui )?elements detected/i,
    /omniparser/i,
    /ocr/i,
    /vision/i,
    /screenshot/i,
    /coordinate/i,
    /click failed/i,
  ],
  ui_drift: [
    /drift/i,
    /offset/i,
    /misaligned/i,
    /grid overlay/i,
    /calibration/i,
  ],
  instruction_ambiguity: [
    /ambiguous/i,
    /unclear/i,
    /clarify/i,
    /missing (info|information|details)/i,
    /not specified/i,
    /no description provided/i,
  ],
  privilege_boundary: [
    /permission/i,
    /access denied/i,
    /forbidden/i,
    /unauthorized/i,
    /not allowed/i,
    /login required/i,
    /credential/i,
  ],
  evaluator_mismatch: [
    /evaluation/i,
    /evaluator/i,
    /verification failed/i,
    /assert/i,
    /expected/i,
    /mismatch/i,
    /did not match/i,
  ],
};

export function classifyFailureLabels(input: {
  error?: string | null;
  status?: string | null;
}): FailureTaxonomyLabel[] {
  const text = `${input.error ?? ''} ${input.status ?? ''}`.trim();
  if (!text) {
    return ['evaluator_mismatch'];
  }

  const labels = new Set<FailureTaxonomyLabel>();

  (Object.keys(LABEL_PATTERNS) as FailureTaxonomyLabel[]).forEach(
    (label) => {
      if (LABEL_PATTERNS[label].some((pattern) => pattern.test(text))) {
        labels.add(label);
      }
    },
  );

  if (labels.size === 0) {
    labels.add('evaluator_mismatch');
  }

  return Array.from(labels);
}

export { FAILURE_TAXONOMY };
