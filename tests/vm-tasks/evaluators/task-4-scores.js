const fs = require('fs');
const { output, readFileTrimmed } = require('./evaluator-utils');

const outputPath = '/tmp/bytebot-task-outputs/top-scores.csv';
const expectedPath = 'tests/vm-tasks/fixtures/task-4/expected-top-scores.csv';

const actual = readFileTrimmed(outputPath);
const expected = fs.readFileSync(expectedPath, 'utf8').trimEnd();

if (actual !== expected) {
  output.fail('Top scores CSV does not match expected output.');
}

output.pass('Top scores CSV matches expected output.');
