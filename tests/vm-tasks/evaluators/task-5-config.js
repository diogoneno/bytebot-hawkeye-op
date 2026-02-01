const fs = require('fs');
const { output, readFileTrimmed } = require('./evaluator-utils');

const outputPath = '/tmp/bytebot-task-outputs/config-updated.yaml';
const expectedPath = 'tests/vm-tasks/fixtures/task-5/expected-config.yaml';

const actual = readFileTrimmed(outputPath);
const expected = fs.readFileSync(expectedPath, 'utf8').trimEnd();

if (actual !== expected) {
  output.fail('Updated config YAML does not match expected output.');
}

output.pass('Updated config YAML matches expected output.');
