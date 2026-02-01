export type VmTaskDefinition = {
  id: string;
  snapshotId: string;
  seed: number;
  instructions: string;
  evaluatorScript: string;
};

export const taskRegistry: Record<string, VmTaskDefinition> = {
  'task-1-lcg': {
    id: 'task-1-lcg',
    snapshotId: 'hawkeye-base-2024-10-01',
    seed: 1337,
    instructions:
      'Using seed 1337, generate 5 values from the LCG formula X_{n+1} = (1103515245 * X_n + 12345) mod 2147483648. '
      + 'Write each value on its own line to /tmp/bytebot-task-outputs/lcg-sequence.txt. No internet access is needed.',
    evaluatorScript: 'tests/vm-tasks/evaluators/task-1-lcg.js',
  },
  'task-2-inventory': {
    id: 'task-2-inventory',
    snapshotId: 'hawkeye-inventory-2024-10-01',
    seed: 2024,
    instructions:
      'Merge inventory updates from tests/vm-tasks/fixtures/task-2/inventory.json and updates.json. '
      + 'Apply each delta to the matching sku, add new skus with provided name, and output the full list sorted by sku. '
      + 'Write JSON to /tmp/bytebot-task-outputs/inventory-merged.json. Use deterministic ordering.',
    evaluatorScript: 'tests/vm-tasks/evaluators/task-2-inventory.js',
  },
  'task-3-summary': {
    id: 'task-3-summary',
    snapshotId: 'hawkeye-report-2024-10-01',
    seed: 31415,
    instructions:
      'Summarize tests/vm-tasks/fixtures/task-3/report.md by counting headings and words. '
      + 'Count headings as lines starting with # or ##. Count words in non-heading lines using alphabetic tokens only. '
      + 'Write JSON {"headingCount": number, "wordCount": number} to /tmp/bytebot-task-outputs/report-summary.json.',
    evaluatorScript: 'tests/vm-tasks/evaluators/task-3-summary.js',
  },
  'task-4-scores': {
    id: 'task-4-scores',
    snapshotId: 'hawkeye-scores-2024-10-01',
    seed: 8080,
    instructions:
      'Filter tests/vm-tasks/fixtures/task-4/scores.csv for rows with score >= 80. '
      + 'Sort by score descending, then name ascending, and write the CSV (including header) to /tmp/bytebot-task-outputs/top-scores.csv.',
    evaluatorScript: 'tests/vm-tasks/evaluators/task-4-scores.js',
  },
  'task-5-config': {
    id: 'task-5-config',
    snapshotId: 'hawkeye-config-2024-10-01',
    seed: 5150,
    instructions:
      'Update tests/vm-tasks/fixtures/task-5/config.yaml by setting server.port to 8081 and features.telemetry to false. '
      + 'Write the updated YAML to /tmp/bytebot-task-outputs/config-updated.yaml with the same key order as the input.',
    evaluatorScript: 'tests/vm-tasks/evaluators/task-5-config.js',
  },
};
